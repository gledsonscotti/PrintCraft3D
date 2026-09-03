import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb, queryAll, queryOne, saveDb } from './server/db';
import { GoogleGenAI } from '@google/genai';
import { analyzePieceWithGemini, generateDynamicFallbackAdvice } from './server/aiAdvisor';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Initialize SQLite database
  const db = await getDb();

  // Ensure no caching on API endpoints so client always gets live data
  app.use('/api', (req: Request, res: Response, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // --- BACKUP & PERSISTENCE SYNC ENDPOINTS ---
  // Export complete workshop database as JSON
  app.get('/api/backup/export', (req: Request, res: Response) => {
    try {
      const printers = queryAll(db, 'SELECT * FROM printers ORDER BY name ASC');
      const filaments = queryAll(db, 'SELECT * FROM filaments ORDER BY material ASC, name ASC');
      const supplies = queryAll(db, 'SELECT * FROM supplies ORDER BY name ASC');
      const products = queryAll(db, 'SELECT * FROM products ORDER BY created_at DESC');
      const printJobs = queryAll(db, 'SELECT * FROM print_jobs ORDER BY created_at DESC');
      const settingsRows = queryAll<{ key: string; value: string }>(db, 'SELECT key, value FROM settings');
      const settingsMap: Record<string, any> = {};
      for (const r of settingsRows) {
        settingsMap[r.key] = isNaN(Number(r.value)) ? r.value : Number(r.value);
      }

      res.json({
        app: 'PrintCraft3D',
        version: '1.2.0',
        exported_at: new Date().toISOString(),
        printers,
        filaments,
        supplies,
        products,
        printJobs,
        settings: settingsMap,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Import complete workshop database from JSON
  app.post('/api/backup/import', (req: Request, res: Response) => {
    try {
      const { printers, filaments, supplies, products, printJobs, settings: importedSettings } = req.body;

      if (Array.isArray(printers)) {
        for (const p of printers) {
          if (!p.id || !p.name) continue;
          db.run(`
            INSERT OR REPLACE INTO printers (id, name, printer_power_watts, bed_heater_watts, total_power_watts, hourly_depreciation, failure_rate_default, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            p.id,
            p.name,
            Number(p.printer_power_watts) || 80,
            Number(p.bed_heater_watts) || 200,
            Number(p.total_power_watts) || 280,
            Number(p.hourly_depreciation) || 0.60,
            Number(p.failure_rate_default) || 10,
            p.status || 'available'
          ]);
        }
      }

      if (Array.isArray(filaments)) {
        for (const f of filaments) {
          if (!f.id || !f.name) continue;
          db.run(`
            INSERT OR REPLACE INTO filaments (id, name, brand, material, color, color_hex, total_weight_g, remaining_weight_g, cost_per_spool, diameter, density)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            f.id,
            f.name,
            f.brand || 'Genérico',
            f.material || 'PLA',
            f.color || 'Preto',
            f.color_hex || '#475569',
            Number(f.total_weight_g) || 1000,
            Number(f.remaining_weight_g !== undefined ? f.remaining_weight_g : 1000),
            Number(f.cost_per_spool) || 90.0,
            Number(f.diameter) || 1.75,
            Number(f.density) || 1.24
          ]);
        }
      }

      if (Array.isArray(supplies)) {
        for (const s of supplies) {
          if (!s.id || !s.name) continue;
          db.run(`
            INSERT OR REPLACE INTO supplies (id, name, unit, unit_cost, in_stock_qty, min_stock_alert)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            s.id,
            s.name,
            s.unit || 'un',
            Number(s.unit_cost) || 0,
            Number(s.in_stock_qty) || 0,
            Number(s.min_stock_alert) || 10
          ]);
        }
      }

      if (Array.isArray(products)) {
        for (const pr of products) {
          if (!pr.id || !pr.name) continue;
          db.run(`
            INSERT OR REPLACE INTO products (
              id, name, category, description, stl_filename, gcode_filename,
              printer_id, filament_id, filament_weight_g, print_time_minutes,
              energy_cost, filament_cost, loss_margin_percent, depreciation_cost,
              labor_cost, extra_supplies_json, extra_supplies_cost, total_cost,
              markup_percent, suggested_price, sale_price, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            pr.id,
            pr.name,
            pr.category || 'Geral',
            pr.description || '',
            pr.stl_filename || '',
            pr.gcode_filename || '',
            pr.printer_id || '',
            pr.filament_id || '',
            Number(pr.filament_weight_g) || 0,
            Number(pr.print_time_minutes) || 0,
            Number(pr.energy_cost) || 0,
            Number(pr.filament_cost) || 0,
            Number(pr.loss_margin_percent) || 10,
            Number(pr.depreciation_cost) || 0,
            Number(pr.labor_cost) || 0,
            typeof pr.extra_supplies_json === 'string' ? pr.extra_supplies_json : JSON.stringify(pr.extra_supplies_json || []),
            Number(pr.extra_supplies_cost) || 0,
            Number(pr.total_cost) || 0,
            Number(pr.markup_percent) || 100,
            Number(pr.suggested_price) || 0,
            Number(pr.sale_price) || 0,
            pr.created_at || new Date().toISOString()
          ]);
        }
      }

      if (importedSettings && typeof importedSettings === 'object') {
        for (const [k, v] of Object.entries(importedSettings)) {
          db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, String(v)]);
        }
      }

      saveDb();
      res.json({ success: true, message: 'Dados restaurados com sucesso!' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Settings
  app.get('/api/settings', (req: Request, res: Response) => {
    try {
      const rows = queryAll<{ key: string; value: string }>(db, 'SELECT key, value FROM settings');
      const settingsMap: Record<string, any> = {};
      for (const r of rows) {
        settingsMap[r.key] = isNaN(Number(r.value)) ? r.value : Number(r.value);
      }
      res.json({
        energy_kwh_rate: settingsMap.energy_kwh_rate ?? 0.85,
        currency: settingsMap.currency ?? 'R$',
        default_loss_margin: settingsMap.default_loss_margin ?? 10,
        hourly_labor_rate: settingsMap.hourly_labor_rate ?? 20.00,
        default_infill: settingsMap.default_infill ?? 20,
        default_layer_height: settingsMap.default_layer_height ?? 0.2
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/settings', (req: Request, res: Response) => {
    try {
      const updates = req.body;
      for (const [k, v] of Object.entries(updates)) {
        db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [k, String(v)]);
      }
      saveDb();
      res.json({ success: true, settings: updates });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Printers
  app.get('/api/printers', (req: Request, res: Response) => {
    try {
      const printers = queryAll(db, 'SELECT * FROM printers ORDER BY name ASC');
      res.json(printers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/printers', (req: Request, res: Response) => {
    try {
      const {
        name,
        printer_power_watts,
        bed_heater_watts,
        hourly_depreciation = 0.50,
        failure_rate_default = 10,
        status = 'available'
      } = req.body;

      const id = 'p-' + Date.now();
      const printerWatts = Number(printer_power_watts) || 80;
      const bedWatts = Number(bed_heater_watts) || 200;
      const totalWatts = printerWatts + bedWatts;

      db.run(`
        INSERT INTO printers (id, name, printer_power_watts, bed_heater_watts, total_power_watts, hourly_depreciation, failure_rate_default, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, name, printerWatts, bedWatts, totalWatts, Number(hourly_depreciation), Number(failure_rate_default), status]);

      saveDb();
      const created = queryOne(db, 'SELECT * FROM printers WHERE id = ?', [id]);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/printers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        printer_power_watts,
        bed_heater_watts,
        hourly_depreciation,
        failure_rate_default,
        status
      } = req.body;

      const printerWatts = Number(printer_power_watts) || 80;
      const bedWatts = Number(bed_heater_watts) || 200;
      const totalWatts = printerWatts + bedWatts;

      db.run(`
        UPDATE printers
        SET name = ?, printer_power_watts = ?, bed_heater_watts = ?, total_power_watts = ?,
            hourly_depreciation = ?, failure_rate_default = ?, status = ?
        WHERE id = ?
      `, [name, printerWatts, bedWatts, totalWatts, Number(hourly_depreciation), Number(failure_rate_default), status, id]);

      saveDb();
      const updated = queryOne(db, 'SELECT * FROM printers WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/printers/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      db.run('DELETE FROM printers WHERE id = ?', [id]);
      saveDb();
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Filaments (Real-Time Stock)
  app.get('/api/filaments', (req: Request, res: Response) => {
    try {
      const filaments = queryAll(db, 'SELECT * FROM filaments ORDER BY material ASC, name ASC');
      res.json(filaments);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/filaments', (req: Request, res: Response) => {
    try {
      const {
        name,
        brand,
        material,
        color,
        color_hex = '#475569',
        total_weight_g = 1000,
        remaining_weight_g,
        cost_per_spool,
        diameter = 1.75,
        density
      } = req.body;

      const id = 'fil-' + Date.now();
      const defDensity = material === 'PETG' ? 1.27 : (material === 'ABS' ? 1.04 : (material === 'TPU' ? 1.21 : 1.24));

      db.run(`
        INSERT INTO filaments (id, name, brand, material, color, color_hex, total_weight_g, remaining_weight_g, cost_per_spool, diameter, density)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        name,
        brand,
        material,
        color,
        color_hex,
        Number(total_weight_g),
        Number(remaining_weight_g !== undefined ? remaining_weight_g : total_weight_g),
        Number(cost_per_spool),
        Number(diameter),
        Number(density || defDensity)
      ]);

      saveDb();
      const created = queryOne(db, 'SELECT * FROM filaments WHERE id = ?', [id]);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/filaments/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const {
        name,
        brand,
        material,
        color,
        color_hex,
        total_weight_g,
        remaining_weight_g,
        cost_per_spool,
        diameter,
        density
      } = req.body;

      db.run(`
        UPDATE filaments
        SET name = ?, brand = ?, material = ?, color = ?, color_hex = ?,
            total_weight_g = ?, remaining_weight_g = ?, cost_per_spool = ?,
            diameter = ?, density = ?
        WHERE id = ?
      `, [
        name, brand, material, color, color_hex,
        Number(total_weight_g), Number(remaining_weight_g), Number(cost_per_spool),
        Number(diameter), Number(density), id
      ]);

      saveDb();
      const updated = queryOne(db, 'SELECT * FROM filaments WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/filaments/:id/stock', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adjustment_g, new_remaining_g } = req.body;

      const current = queryOne<{ remaining_weight_g: number }>(db, 'SELECT remaining_weight_g FROM filaments WHERE id = ?', [id]);
      if (!current) return res.status(404).json({ error: 'Filamento não encontrado' });

      let nextStock = current.remaining_weight_g;
      if (new_remaining_g !== undefined) {
        nextStock = Number(new_remaining_g);
      } else if (adjustment_g !== undefined) {
        nextStock = Math.max(0, current.remaining_weight_g + Number(adjustment_g));
      }

      db.run('UPDATE filaments SET remaining_weight_g = ? WHERE id = ?', [nextStock, id]);
      saveDb();
      const updated = queryOne(db, 'SELECT * FROM filaments WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/filaments/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      db.run('DELETE FROM filaments WHERE id = ?', [id]);
      saveDb();
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Supplies (Insumos extras: argolas, correntes, embalagens, parafusos, imãs)
  app.get('/api/supplies', (req: Request, res: Response) => {
    try {
      const supplies = queryAll(db, 'SELECT * FROM supplies ORDER BY name ASC');
      res.json(supplies);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/supplies', (req: Request, res: Response) => {
    try {
      const { name, unit = 'un', unit_cost = 0, in_stock_qty = 0, min_stock_alert = 10 } = req.body;
      const id = 'sup-' + Date.now();

      db.run(`
        INSERT INTO supplies (id, name, unit, unit_cost, in_stock_qty, min_stock_alert)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, name, unit, Number(unit_cost), Number(in_stock_qty), Number(min_stock_alert)]);

      saveDb();
      const created = queryOne(db, 'SELECT * FROM supplies WHERE id = ?', [id]);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/supplies/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, unit, unit_cost, in_stock_qty, min_stock_alert } = req.body;

      db.run(`
        UPDATE supplies
        SET name = ?, unit = ?, unit_cost = ?, in_stock_qty = ?, min_stock_alert = ?
        WHERE id = ?
      `, [name, unit, Number(unit_cost), Number(in_stock_qty), Number(min_stock_alert), id]);

      saveDb();
      const updated = queryOne(db, 'SELECT * FROM supplies WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/supplies/:id/stock', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adjustment_qty, new_stock_qty } = req.body;

      const current = queryOne<{ in_stock_qty: number }>(db, 'SELECT in_stock_qty FROM supplies WHERE id = ?', [id]);
      if (!current) return res.status(404).json({ error: 'Insumo não encontrado' });

      let nextStock = current.in_stock_qty;
      if (new_stock_qty !== undefined) {
        nextStock = Number(new_stock_qty);
      } else if (adjustment_qty !== undefined) {
        nextStock = Math.max(0, current.in_stock_qty + Number(adjustment_qty));
      }

      db.run('UPDATE supplies SET in_stock_qty = ? WHERE id = ?', [nextStock, id]);
      saveDb();
      const updated = queryOne(db, 'SELECT * FROM supplies WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/supplies/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      db.run('DELETE FROM supplies WHERE id = ?', [id]);
      saveDb();
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Products
  app.get('/api/products', (req: Request, res: Response) => {
    try {
      const products = queryAll(db, 'SELECT * FROM products ORDER BY created_at DESC');
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/products', (req: Request, res: Response) => {
    try {
      const {
        name,
        category = 'Geral',
        description = '',
        stl_filename = '',
        gcode_filename = '',
        printer_id,
        filament_id,
        filament_weight_g,
        print_time_minutes,
        energy_cost,
        filament_cost,
        loss_margin_percent = 10,
        depreciation_cost = 0,
        labor_cost = 0,
        extra_supplies_json = '[]',
        extra_supplies_cost = 0,
        total_cost,
        markup_percent = 100,
        suggested_price,
        sale_price,
        ready_stock_qty = 0,
        min_stock_alert = 5
      } = req.body;

      const id = 'prod-' + Date.now();
      const createdAt = new Date().toISOString();

      db.run(`
        INSERT INTO products (
          id, name, category, description, stl_filename, gcode_filename,
          printer_id, filament_id, filament_weight_g, print_time_minutes,
          energy_cost, filament_cost, loss_margin_percent, depreciation_cost,
          labor_cost, extra_supplies_json, extra_supplies_cost, total_cost,
          markup_percent, suggested_price, sale_price, ready_stock_qty, min_stock_alert, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, name, category, description, stl_filename, gcode_filename,
        printer_id, filament_id, Number(filament_weight_g), Number(print_time_minutes),
        Number(energy_cost), Number(filament_cost), Number(loss_margin_percent), Number(depreciation_cost),
        Number(labor_cost), extra_supplies_json, Number(extra_supplies_cost), Number(total_cost),
        Number(markup_percent), Number(suggested_price), Number(sale_price || suggested_price),
        Number(ready_stock_qty), Number(min_stock_alert), createdAt
      ]);

      saveDb();
      const created = queryOne(db, 'SELECT * FROM products WHERE id = ?', [id]);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/products/:id/stock', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { adjustment_qty, new_stock_qty } = req.body;

      const current = queryOne<{ ready_stock_qty: number }>(db, 'SELECT ready_stock_qty FROM products WHERE id = ?', [id]);
      if (!current) return res.status(404).json({ error: 'Produto não encontrado' });

      let nextStock = current.ready_stock_qty || 0;
      if (new_stock_qty !== undefined) {
        nextStock = Math.max(0, Number(new_stock_qty));
      } else if (adjustment_qty !== undefined) {
        nextStock = Math.max(0, (current.ready_stock_qty || 0) + Number(adjustment_qty));
      }

      db.run('UPDATE products SET ready_stock_qty = ? WHERE id = ?', [nextStock, id]);
      saveDb();
      const updated = queryOne(db, 'SELECT * FROM products WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/products/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      db.run('DELETE FROM products WHERE id = ?', [id]);
      saveDb();
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Print Execution & Automatic Real-Time Stock Deduction
  app.get('/api/print-jobs', (req: Request, res: Response) => {
    try {
      const jobs = queryAll(db, 'SELECT * FROM print_jobs ORDER BY created_at DESC');
      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/print-jobs', (req: Request, res: Response) => {
    try {
      const {
        product_id,
        product_name,
        printer_id,
        filament_id,
        quantity = 1,
        filament_used_g,
        total_time_minutes,
        total_cost,
        supplies_used = [], // array of { supply_id, qty }
        status = 'completed'
      } = req.body;

      const qty = Math.max(1, Number(quantity));
      const totalFilament = Number(filament_used_g) * qty;
      const totalTime = Number(total_time_minutes) * qty;
      const totalJobCost = Number(total_cost) * qty;

      const printer = queryOne<{ name: string }>(db, 'SELECT name FROM printers WHERE id = ?', [printer_id]);
      const filament = queryOne<{ name: string; remaining_weight_g: number }>(db, 'SELECT name, remaining_weight_g FROM filaments WHERE id = ?', [filament_id]);

      const printerName = printer ? printer.name : 'Impressora Padrão';
      const filamentName = filament ? filament.name : 'Filamento';

      // Deduct filament from stock
      if (filament) {
        const nextFilamentStock = Math.max(0, filament.remaining_weight_g - totalFilament);
        db.run('UPDATE filaments SET remaining_weight_g = ? WHERE id = ?', [nextFilamentStock, filament_id]);
      }

      // Deduct each extra supply from stock
      for (const item of supplies_used) {
        if (item.supply_id && item.qty) {
          const needed = Number(item.qty) * qty;
          db.run(`
            UPDATE supplies
            SET in_stock_qty = MAX(0, in_stock_qty - ?)
            WHERE id = ?
          `, [needed, item.supply_id]);
        }
      }

      const jobId = 'job-' + Date.now();
      const createdAt = new Date().toISOString();

      db.run(`
        INSERT INTO print_jobs (
          id, product_id, product_name, printer_id, printer_name,
          filament_id, filament_name, quantity, filament_used_g, total_time_minutes,
          total_cost, supplies_used_json, deducted_from_stock, status, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        jobId, product_id || null, product_name, printer_id, printerName,
        filament_id, filamentName, qty, totalFilament, totalTime,
        totalJobCost, JSON.stringify(supplies_used), 1, status, createdAt
      ]);

      // Automatic Ready-Product Stock Addition (Acrescentar as peças prontas no estoque de produtos)
      let matchedProductId = product_id;
      if (!matchedProductId && product_name) {
        const found = queryOne<{ id: string }>(db, 'SELECT id FROM products WHERE LOWER(name) = LOWER(?) LIMIT 1', [product_name.trim()]);
        if (found) matchedProductId = found.id;
      }

      if (matchedProductId) {
        db.run(`
          UPDATE products
          SET ready_stock_qty = ready_stock_qty + ?
          WHERE id = ?
        `, [qty, matchedProductId]);
      }

      saveDb();

      const createdJob = queryOne(db, 'SELECT * FROM print_jobs WHERE id = ?', [jobId]);
      const updatedProduct = matchedProductId ? queryOne(db, 'SELECT * FROM products WHERE id = ?', [matchedProductId]) : null;

      res.status(201).json({
        success: true,
        job: createdJob,
        stockDeducted: {
          filament_g: totalFilament,
          suppliesCount: supplies_used.length
        },
        readyStockAdded: {
          quantity: qty,
          product_id: matchedProductId || null,
          product: updatedProduct
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Sales Management API (Controle de Vendas de Produtos Prontos: Plataformas, CNPJ, PF)
  app.get('/api/sales', (req: Request, res: Response) => {
    try {
      const sales = queryAll(db, 'SELECT * FROM product_sales ORDER BY created_at DESC');
      res.json(sales);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/sales', (req: Request, res: Response) => {
    try {
      const {
        product_id,
        product_name,
        quantity,
        unit_price,
        channel_type, // 'platform' | 'cnpj' | 'pf'
        channel_name, // 'Mercado Livre', 'Shopee', 'CNPJ: Razão Social', 'Pessoa Física: Nome'
        customer_document = null,
        customer_name = null,
        platform_fee_percent = 0,
        payment_method = null,
        notes = null
      } = req.body;

      const qty = Math.max(1, Number(quantity) || 1);
      const price = Number(unit_price) || 0;
      const totalRevenue = price * qty;

      let unitCost = 0;
      let targetProdName = product_name || 'Produto Impresso 3D';

      if (product_id) {
        const prod = queryOne<{ name: string; total_cost: number; ready_stock_qty: number }>(
          db,
          'SELECT name, total_cost, ready_stock_qty FROM products WHERE id = ?',
          [product_id]
        );
        if (prod) {
          unitCost = prod.total_cost || 0;
          targetProdName = prod.name;
          // Deduct from finished product stock
          db.run('UPDATE products SET ready_stock_qty = MAX(0, ready_stock_qty - ?) WHERE id = ?', [qty, product_id]);
        }
      }

      const totalCost = unitCost * qty;
      const feePercent = Math.max(0, Number(platform_fee_percent) || 0);
      const platformFeeAmount = totalRevenue * (feePercent / 100);
      const profit = totalRevenue - totalCost - platformFeeAmount;

      const saleId = 'sale-' + Date.now();
      const createdAt = new Date().toISOString();

      db.run(`
        INSERT INTO product_sales (
          id, product_id, product_name, quantity, unit_price, total_revenue,
          unit_cost, total_cost, profit, channel_type, channel_name,
          customer_document, customer_name, platform_fee_percent, platform_fee_amount,
          payment_method, notes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        saleId, product_id || null, targetProdName, qty, price, totalRevenue,
        unitCost, totalCost, profit, channel_type || 'platform', channel_name || 'Plataforma',
        customer_document, customer_name, feePercent, platformFeeAmount,
        payment_method, notes, createdAt
      ]);

      saveDb();

      const createdSale = queryOne(db, 'SELECT * FROM product_sales WHERE id = ?', [saleId]);
      const updatedProduct = product_id ? queryOne(db, 'SELECT * FROM products WHERE id = ?', [product_id]) : null;

      res.status(201).json({
        success: true,
        sale: createdSale,
        updatedProduct
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/sales/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { restore_stock = true } = req.query;

      const sale = queryOne<{ product_id: string; quantity: number }>(db, 'SELECT product_id, quantity FROM product_sales WHERE id = ?', [id]);
      if (!sale) return res.status(404).json({ error: 'Venda não encontrada' });

      // Restore finished product stock on cancellation/delete
      if (restore_stock && sale.product_id) {
        db.run('UPDATE products SET ready_stock_qty = ready_stock_qty + ? WHERE id = ?', [sale.quantity, sale.product_id]);
      }

      db.run('DELETE FROM product_sales WHERE id = ?', [id]);
      saveDb();

      const updatedProduct = sale.product_id ? queryOne(db, 'SELECT * FROM products WHERE id = ?', [sale.product_id]) : null;

      res.json({
        success: true,
        id,
        restoredStock: restore_stock && sale.product_id ? sale.quantity : 0,
        updatedProduct
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // AI Assistant for Print Optimization (using Gemini Server-Side Multimodal or Fallback)
  app.post('/api/ai-optimize', async (req: Request, res: Response) => {
    const input = req.body;
    try {
      const ai = getAI();
      if (!ai) {
        const fallback = generateDynamicFallbackAdvice(input);
        return res.json(fallback);
      }

      const result = await analyzePieceWithGemini(ai, input);
      return res.json(result);
    } catch (e: any) {
      console.warn('Gemini optimization notice, serving resilient fallback:', e?.message || e);
      const fallback = generateDynamicFallbackAdvice(input);
      return res.json(fallback);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`3D Print Control Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
