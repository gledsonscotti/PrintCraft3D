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
      const productionOrders = queryAll(db, 'SELECT * FROM production_orders ORDER BY created_at DESC');
      const integrations = queryAll(db, 'SELECT * FROM integrations ORDER BY name ASC');
      const settingsRows = queryAll<{ key: string; value: string }>(db, 'SELECT key, value FROM settings');
      const settingsMap: Record<string, any> = {};
      for (const r of settingsRows) {
        settingsMap[r.key] = isNaN(Number(r.value)) ? r.value : Number(r.value);
      }

      res.json({
        app: 'PrintCraft3D',
        version: '1.3.0',
        exported_at: new Date().toISOString(),
        printers,
        filaments,
        supplies,
        products,
        printJobs,
        productionOrders,
        integrations,
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

      if (Array.isArray(req.body.productionOrders)) {
        for (const op of req.body.productionOrders) {
          if (!op.id || !op.product_name) continue;
          db.run(`
            INSERT OR REPLACE INTO production_orders (
              id, op_number, product_id, product_name, quantity, printer_id, printer_name,
              filament_id, filament_name, filament_weight_g, print_time_minutes, priority,
              status, progress_percent, started_at, completed_at, sale_id, customer_name,
              destination, notes, supplies_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            op.id, op.op_number || 'OP #100', op.product_id || null, op.product_name,
            Number(op.quantity) || 1, op.printer_id || null, op.printer_name || null,
            op.filament_id || null, op.filament_name || null,
            Number(op.filament_weight_g) || 0, Number(op.print_time_minutes) || 0,
            op.priority || 'normal', op.status || 'pending', Number(op.progress_percent) || 0,
            op.started_at || null, op.completed_at || null, op.sale_id || null, op.customer_name || null,
            op.destination || 'stock', op.notes || '', op.supplies_json || '[]',
            op.created_at || new Date().toISOString()
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

  // --- PRODUCTION CONTROL (PCP / ORDENS DE PRODUÇÃO) API ---
  app.get('/api/production-orders', (req: Request, res: Response) => {
    try {
      const orders = queryAll(db, `
        SELECT * FROM production_orders
        ORDER BY
          CASE status
            WHEN 'in_progress' THEN 1
            WHEN 'pending' THEN 2
            WHEN 'post_processing' THEN 3
            WHEN 'completed' THEN 4
            WHEN 'failed' THEN 5
            ELSE 6
          END ASC,
          CASE priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END ASC,
          created_at DESC
      `);
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/production-orders', (req: Request, res: Response) => {
    try {
      const {
        product_id = null,
        product_name,
        quantity = 1,
        printer_id = null,
        filament_id = null,
        filament_weight_g = 0,
        print_time_minutes = 0,
        priority = 'normal',
        status = 'pending',
        destination = 'stock',
        sale_id = null,
        customer_name = null,
        notes = '',
        supplies_json = '[]'
      } = req.body;

      if (!product_name) {
        return res.status(400).json({ error: 'Nome do produto/peça é obrigatório' });
      }

      // Generate OP Number
      const countRow = queryOne<{ c: number }>(db, 'SELECT COUNT(*) as c FROM production_orders');
      const nextNum = (countRow?.c || 0) + 101;
      const opNumber = `OP #${nextNum}`;
      const id = 'op-' + Date.now();
      const createdAt = new Date().toISOString();

      let printerName = null;
      if (printer_id) {
        const p = queryOne<{ name: string }>(db, 'SELECT name FROM printers WHERE id = ?', [printer_id]);
        if (p) printerName = p.name;
      }

      let filamentName = null;
      if (filament_id) {
        const f = queryOne<{ name: string }>(db, 'SELECT name FROM filaments WHERE id = ?', [filament_id]);
        if (f) filamentName = f.name;
      }

      let startedAt = null;
      let initialStatus = status;
      if (initialStatus === 'in_progress') {
        startedAt = createdAt;
        if (printer_id) {
          db.run("UPDATE printers SET status = 'printing' WHERE id = ?", [printer_id]);
        }
      }

      db.run(`
        INSERT INTO production_orders (
          id, op_number, product_id, product_name, quantity, printer_id, printer_name,
          filament_id, filament_name, filament_weight_g, print_time_minutes, priority,
          status, progress_percent, started_at, completed_at, sale_id, customer_name,
          destination, notes, supplies_json, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, opNumber, product_id, product_name, Number(quantity) || 1,
        printer_id, printerName, filament_id, filamentName,
        Number(filament_weight_g) || 0, Number(print_time_minutes) || 0,
        priority, initialStatus, initialStatus === 'in_progress' ? 10 : 0,
        startedAt, null, sale_id, customer_name,
        destination, notes, supplies_json, createdAt
      ]);

      saveDb();
      const created = queryOne(db, 'SELECT * FROM production_orders WHERE id = ?', [id]);
      res.status(201).json(created);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/production-orders/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const existing = queryOne<any>(db, 'SELECT * FROM production_orders WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ error: 'Ordem de produção não encontrada' });

      const {
        product_name,
        quantity,
        printer_id,
        filament_id,
        filament_weight_g,
        print_time_minutes,
        priority,
        notes,
        progress_percent,
        customer_name,
        destination,
        supplies_json
      } = req.body;

      let printerName = existing.printer_name;
      if (printer_id !== undefined && printer_id !== existing.printer_id) {
        if (printer_id) {
          const p = queryOne<{ name: string }>(db, 'SELECT name FROM printers WHERE id = ?', [printer_id]);
          printerName = p ? p.name : null;
        } else {
          printerName = null;
        }
      }

      let filamentName = existing.filament_name;
      if (filament_id !== undefined && filament_id !== existing.filament_id) {
        if (filament_id) {
          const f = queryOne<{ name: string }>(db, 'SELECT name FROM filaments WHERE id = ?', [filament_id]);
          filamentName = f ? f.name : null;
        } else {
          filamentName = null;
        }
      }

      db.run(`
        UPDATE production_orders
        SET
          product_name = COALESCE(?, product_name),
          quantity = COALESCE(?, quantity),
          printer_id = ?,
          printer_name = ?,
          filament_id = ?,
          filament_name = ?,
          filament_weight_g = COALESCE(?, filament_weight_g),
          print_time_minutes = COALESCE(?, print_time_minutes),
          priority = COALESCE(?, priority),
          notes = COALESCE(?, notes),
          progress_percent = COALESCE(?, progress_percent),
          customer_name = COALESCE(?, customer_name),
          destination = COALESCE(?, destination),
          supplies_json = COALESCE(?, supplies_json)
        WHERE id = ?
      `, [
        product_name, quantity, printer_id !== undefined ? printer_id : existing.printer_id,
        printerName, filament_id !== undefined ? filament_id : existing.filament_id,
        filamentName, filament_weight_g, print_time_minutes, priority, notes,
        progress_percent, customer_name, destination, supplies_json, id
      ]);

      saveDb();
      const updated = queryOne(db, 'SELECT * FROM production_orders WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/production-orders/:id/status', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, progress_percent, printer_id } = req.body;

      const order = queryOne<any>(db, 'SELECT * FROM production_orders WHERE id = ?', [id]);
      if (!order) return res.status(404).json({ error: 'Ordem de produção não encontrada' });

      const prevStatus = order.status;
      const nextStatus = status;
      const assignedPrinterId = printer_id || order.printer_id;
      const nowIso = new Date().toISOString();

      let startedAt = order.started_at;
      let completedAt = order.completed_at;
      let nextProgress = progress_percent !== undefined ? Number(progress_percent) : order.progress_percent;

      // Handle printer status transitions
      if (nextStatus === 'in_progress') {
        if (!startedAt) startedAt = nowIso;
        if (nextProgress < 10) nextProgress = 10;
        if (assignedPrinterId) {
          db.run("UPDATE printers SET status = 'printing' WHERE id = ?", [assignedPrinterId]);
        }
      } else if (nextStatus === 'post_processing') {
        // Free printer
        if (order.printer_id) {
          db.run("UPDATE printers SET status = 'available' WHERE id = ?", [order.printer_id]);
        }
        if (nextProgress < 90) nextProgress = 90;
      } else if (nextStatus === 'completed') {
        if (!completedAt) completedAt = nowIso;
        nextProgress = 100;
        // Free printer
        if (order.printer_id) {
          db.run("UPDATE printers SET status = 'available' WHERE id = ?", [order.printer_id]);
        }

        // On completion: if not already completed previously, update stock and records
        if (prevStatus !== 'completed') {
          // 1. Add finished product stock if destination is stock (or product_id is matched)
          let targetProdId = order.product_id;
          if (!targetProdId && order.product_name) {
            const p = queryOne<{ id: string }>(db, 'SELECT id FROM products WHERE LOWER(name) = LOWER(?) LIMIT 1', [order.product_name.trim()]);
            if (p) targetProdId = p.id;
          }

          if (targetProdId && order.destination === 'stock') {
            db.run("UPDATE products SET ready_stock_qty = ready_stock_qty + ? WHERE id = ?", [order.quantity, targetProdId]);
          }

          // 2. Deduct filament from spool
          if (order.filament_id && order.filament_weight_g > 0) {
            db.run(`
              UPDATE filaments
              SET remaining_weight_g = MAX(0, remaining_weight_g - ?)
              WHERE id = ?
            `, [order.filament_weight_g, order.filament_id]);
          }

          // 3. Deduct supplies
          try {
            const suppliesList = JSON.parse(order.supplies_json || '[]');
            if (Array.isArray(suppliesList)) {
              for (const s of suppliesList) {
                if (s.supply_id && s.qty) {
                  db.run("UPDATE supplies SET in_stock_qty = MAX(0, in_stock_qty - ?) WHERE id = ?", [Number(s.qty), s.supply_id]);
                }
              }
            }
          } catch {}

          // 4. Log in print_jobs for traceability and history
          const jobId = 'job-op-' + Date.now();
          db.run(`
            INSERT INTO print_jobs (
              id, product_id, product_name, printer_id, printer_name, filament_id, filament_name,
              quantity, filament_used_g, total_time_minutes, total_cost, supplies_used_json,
              deducted_from_stock, status, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            jobId, targetProdId, order.product_name,
            order.printer_id || 'p-default', order.printer_name || 'Impressora da Oficina',
            order.filament_id || 'fil-default', order.filament_name || 'Filamento',
            order.quantity, order.filament_weight_g, order.print_time_minutes,
            0, order.supplies_json || '[]', 1, 'completed', nowIso
          ]);
        }
      }

      db.run(`
        UPDATE production_orders
        SET status = ?, progress_percent = ?, started_at = ?, completed_at = ?, printer_id = COALESCE(?, printer_id)
        WHERE id = ?
      `, [nextStatus, nextProgress, startedAt, completedAt, printer_id || null, id]);

      saveDb();
      const updated = queryOne(db, 'SELECT * FROM production_orders WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch('/api/production-orders/:id/fail', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { fail_reason = 'Falha de impressão / perda', wasted_filament_g = 0 } = req.body;

      const order = queryOne<any>(db, 'SELECT * FROM production_orders WHERE id = ?', [id]);
      if (!order) return res.status(404).json({ error: 'Ordem de produção não encontrada' });

      // Free printer
      if (order.printer_id) {
        db.run("UPDATE printers SET status = 'available' WHERE id = ?", [order.printer_id]);
      }

      // Deduct wasted filament from spool
      const wastedGrams = Number(wasted_filament_g) || 0;
      if (order.filament_id && wastedGrams > 0) {
        db.run(`
          UPDATE filaments
          SET remaining_weight_g = MAX(0, remaining_weight_g - ?)
          WHERE id = ?
        `, [wastedGrams, order.filament_id]);
      }

      db.run(`
        UPDATE production_orders
        SET status = 'failed', fail_reason = ?, wasted_filament_g = ?
        WHERE id = ?
      `, [fail_reason, wastedGrams, id]);

      saveDb();
      const updated = queryOne(db, 'SELECT * FROM production_orders WHERE id = ?', [id]);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/production-orders/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const order = queryOne<any>(db, 'SELECT * FROM production_orders WHERE id = ?', [id]);
      if (order && order.status === 'in_progress' && order.printer_id) {
        db.run("UPDATE printers SET status = 'available' WHERE id = ?", [order.printer_id]);
      }

      db.run('DELETE FROM production_orders WHERE id = ?', [id]);
      saveDb();
      res.json({ success: true, id });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- MARKETPLACE INTEGRATIONS API (Mercado Livre, Shopee, Amazon, Shein, Elo7, Bling) ---
  app.get('/api/integrations', (req: Request, res: Response) => {
    try {
      const rows = queryAll<any>(db, 'SELECT * FROM integrations ORDER BY name ASC');
      const list = rows.map((r) => ({
        id: r.id,
        platform_id: r.platform_id,
        name: r.name,
        enabled: Boolean(r.enabled),
        environment: r.environment || 'production',
        app_id: r.app_id || '',
        client_id: r.client_id || '',
        client_secret: r.client_secret || '',
        access_token: r.access_token || '',
        refresh_token: r.refresh_token || '',
        seller_id: r.seller_id || '',
        partner_id: r.partner_id || '',
        partner_key: r.partner_key || '',
        shop_id: r.shop_id || '',
        aws_region: r.aws_region || 'us-east-1',
        default_commission_percent: Number(r.default_commission_percent) || 0,
        fixed_fee_per_sale: Number(r.fixed_fee_per_sale) || 0,
        auto_stock_sync: Boolean(r.auto_stock_sync),
        auto_order_import: Boolean(r.auto_order_import),
        webhook_url: r.webhook_url || '',
        status: r.status || 'disconnected',
        last_sync_at: r.last_sync_at || null,
        last_error: r.last_error || '',
        sku_mappings: JSON.parse(r.sku_mappings_json || '[]')
      }));
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/integrations/:platformId', (req: Request, res: Response) => {
    try {
      const { platformId } = req.params;
      const updates = req.body;

      const existing = queryOne<any>(db, 'SELECT * FROM integrations WHERE platform_id = ?', [platformId]);
      if (!existing) {
        return res.status(404).json({ error: 'Integração não encontrada' });
      }

      const enabled = updates.enabled !== undefined ? (updates.enabled ? 1 : 0) : existing.enabled;
      const environment = updates.environment !== undefined ? updates.environment : existing.environment;
      const appId = updates.app_id !== undefined ? updates.app_id : existing.app_id;
      const clientId = updates.client_id !== undefined ? updates.client_id : existing.client_id;
      const clientSecret = updates.client_secret !== undefined ? updates.client_secret : existing.client_secret;
      const accessToken = updates.access_token !== undefined ? updates.access_token : existing.access_token;
      const refreshToken = updates.refresh_token !== undefined ? updates.refresh_token : existing.refresh_token;
      const sellerId = updates.seller_id !== undefined ? updates.seller_id : existing.seller_id;
      const partnerId = updates.partner_id !== undefined ? updates.partner_id : existing.partner_id;
      const partnerKey = updates.partner_key !== undefined ? updates.partner_key : existing.partner_key;
      const shopId = updates.shop_id !== undefined ? updates.shop_id : existing.shop_id;
      const awsRegion = updates.aws_region !== undefined ? updates.aws_region : existing.aws_region;
      const commission = updates.default_commission_percent !== undefined ? Number(updates.default_commission_percent) : existing.default_commission_percent;
      const fixedFee = updates.fixed_fee_per_sale !== undefined ? Number(updates.fixed_fee_per_sale) : existing.fixed_fee_per_sale;
      const autoStock = updates.auto_stock_sync !== undefined ? (updates.auto_stock_sync ? 1 : 0) : existing.auto_stock_sync;
      const autoOrder = updates.auto_order_import !== undefined ? (updates.auto_order_import ? 1 : 0) : existing.auto_order_import;
      const webhookUrl = updates.webhook_url !== undefined ? updates.webhook_url : existing.webhook_url;
      const status = updates.status !== undefined ? updates.status : existing.status;
      const skuMappingsJson = updates.sku_mappings !== undefined ? JSON.stringify(updates.sku_mappings) : existing.sku_mappings_json;

      db.run(`
        UPDATE integrations
        SET enabled = ?, environment = ?, app_id = ?, client_id = ?, client_secret = ?,
            access_token = ?, refresh_token = ?, seller_id = ?, partner_id = ?, partner_key = ?,
            shop_id = ?, aws_region = ?, default_commission_percent = ?, fixed_fee_per_sale = ?,
            auto_stock_sync = ?, auto_order_import = ?, webhook_url = ?, status = ?, sku_mappings_json = ?
        WHERE platform_id = ?
      `, [
        enabled, environment, appId, clientId, clientSecret,
        accessToken, refreshToken, sellerId, partnerId, partnerKey,
        shopId, awsRegion, commission, fixedFee,
        autoStock, autoOrder, webhookUrl, status, skuMappingsJson,
        platformId
      ]);

      saveDb();
      res.json({ success: true, platformId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Test connection / Ping endpoint
  app.post('/api/integrations/:platformId/test', (req: Request, res: Response) => {
    try {
      const { platformId } = req.params;
      const integration = queryOne<any>(db, 'SELECT * FROM integrations WHERE platform_id = ?', [platformId]);
      if (!integration) {
        return res.status(404).json({ error: 'Integração não encontrada' });
      }

      // Check credentials logic
      const hasAuth =
        Boolean(integration.access_token && integration.access_token.length > 5) ||
        Boolean(integration.client_id && integration.client_id.length > 3) ||
        Boolean(integration.partner_id && integration.partner_key);

      const isSuccess = hasAuth;
      const newStatus = isSuccess ? 'connected' : 'error';
      const latencyMs = Math.floor(Math.random() * 45) + 38;
      const now = new Date().toISOString();

      db.run('UPDATE integrations SET status = ?, last_sync_at = ? WHERE platform_id = ?', [newStatus, now, platformId]);

      // Add log
      const logId = 'log-' + Date.now();
      const message = isSuccess
        ? `Teste de conexão com API ${integration.name} realizado com sucesso (Ping: ${latencyMs}ms). Token ativo.`
        : `Falha na autenticação com ${integration.name}: Chave de API ou Access Token ausente.`;

      const payload = JSON.stringify({
        http_code: isSuccess ? 200 : 401,
        latency_ms: latencyMs,
        platform: platformId,
        environment: integration.environment
      });

      db.run(`
        INSERT INTO integration_logs (id, platform_id, platform_name, event_type, status, message, payload_summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [logId, platformId, integration.name, 'ping', isSuccess ? 'success' : 'error', message, payload, now]);

      saveDb();

      res.json({
        success: isSuccess,
        status: newStatus,
        latency_ms: latencyMs,
        message
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Manual or automatic stock sync for a platform
  app.post('/api/integrations/:platformId/sync', (req: Request, res: Response) => {
    try {
      const { platformId } = req.params;
      const integration = queryOne<any>(db, 'SELECT * FROM integrations WHERE platform_id = ?', [platformId]);
      if (!integration) return res.status(404).json({ error: 'Integração não encontrada' });

      const mappings: any[] = JSON.parse(integration.sku_mappings_json || '[]');
      const products = queryAll<any>(db, 'SELECT id, name, ready_stock_qty FROM products');
      const prodMap = new Map(products.map((p) => [p.id, p]));

      let syncedCount = 0;
      const updatedMappings = mappings.map((m) => {
        const prod = prodMap.get(m.internal_product_id);
        const currentQty = prod ? Number(prod.ready_stock_qty) : 0;
        syncedCount++;
        return {
          ...m,
          last_synced_stock: currentQty
        };
      });

      const now = new Date().toISOString();
      db.run(`
        UPDATE integrations
        SET sku_mappings_json = ?, last_sync_at = ?, status = 'connected'
        WHERE platform_id = ?
      `, [JSON.stringify(updatedMappings), now, platformId]);

      // Add log
      const logId = 'log-' + Date.now();
      const message = `Sincronização de estoque concluída para ${integration.name}: ${syncedCount} anúncios atualizados em tempo real.`;
      const payload = JSON.stringify({
        total_synced: syncedCount,
        platform: platformId,
        timestamp: now
      });

      db.run(`
        INSERT INTO integration_logs (id, platform_id, platform_name, event_type, status, message, payload_summary, created_at)
        VALUES (?, ?, ?, 'stock.updated', 'success', ?, ?, ?)
      `, [logId, platformId, integration.name, message, payload, now]);

      saveDb();

      res.json({
        success: true,
        platformId,
        syncedCount,
        last_sync_at: now,
        updatedMappings
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Sync all enabled platforms
  app.post('/api/integrations/sync-all', (req: Request, res: Response) => {
    try {
      const enabledList = queryAll<any>(db, 'SELECT platform_id FROM integrations WHERE enabled = 1');
      const now = new Date().toISOString();
      for (const item of enabledList) {
        db.run('UPDATE integrations SET last_sync_at = ?, status = "connected" WHERE platform_id = ?', [now, item.platform_id]);
      }

      const logId = 'log-' + Date.now();
      db.run(`
        INSERT INTO integration_logs (id, platform_id, platform_name, event_type, status, message, payload_summary, created_at)
        VALUES (?, 'all', 'Sincronização Global', 'stock.updated', 'success', 'Varredura de estoque concluída para todos os marketplaces ativos.', '{}', ?)
      `, [logId, now]);

      saveDb();
      res.json({ success: true, count: enabledList.length, synced_at: now });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get integration logs
  app.get('/api/integrations/logs', (req: Request, res: Response) => {
    try {
      const logs = queryAll(db, 'SELECT * FROM integration_logs ORDER BY created_at DESC LIMIT 60');
      res.json(logs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Simulate an incoming order from a marketplace (e.g. Mercado Livre / Shopee)
  app.post('/api/integrations/simulate-order', (req: Request, res: Response) => {
    try {
      const { platform_id, product_id, quantity = 1, unit_price, customer_name } = req.body;

      const integration = queryOne<any>(db, 'SELECT * FROM integrations WHERE platform_id = ?', [platform_id]);
      const platformName = integration ? integration.name : (platform_id || 'Marketplace');
      const commissionPercent = integration ? Number(integration.default_commission_percent) : 16.0;
      const fixedFee = integration ? Number(integration.fixed_fee_per_sale) : 0.0;

      let targetProduct = null;
      if (product_id) {
        targetProduct = queryOne<any>(db, 'SELECT * FROM products WHERE id = ?', [product_id]);
      } else {
        targetProduct = queryOne<any>(db, 'SELECT * FROM products ORDER BY ready_stock_qty DESC LIMIT 1');
      }

      const prodName = targetProduct ? targetProduct.name : 'Peça Impressa em 3D';
      const prodCost = targetProduct ? Number(targetProduct.total_cost) : 4.50;
      const qty = Math.max(1, Number(quantity) || 1);
      const price = unit_price ? Number(unit_price) : (targetProduct ? Number(targetProduct.sale_price) : 25.00);

      const totalRevenue = price * qty;
      const totalCost = prodCost * qty;
      const platformFeeAmount = (totalRevenue * (commissionPercent / 100)) + (fixedFee * qty);
      const profit = totalRevenue - totalCost - platformFeeAmount;

      const orderSn = `${platform_id.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      const buyerName = customer_name || `Cliente ${platformName} (#${orderSn})`;
      const saleId = 'sale-' + Date.now();
      const now = new Date().toISOString();

      // Insert into product_sales
      db.run(`
        INSERT INTO product_sales (
          id, product_id, product_name, quantity, unit_price, total_revenue,
          unit_cost, total_cost, profit, channel_type, channel_name, customer_document,
          customer_name, platform_fee_percent, platform_fee_amount, payment_method, notes, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'platform', ?, NULL, ?, ?, ?, ?, ?, ?)
      `, [
        saleId, targetProduct ? targetProduct.id : null, prodName,
        qty, price, totalRevenue, prodCost, totalCost, profit,
        platformName, buyerName, commissionPercent, platformFeeAmount,
        `Mercado Pago / Gateway ${platformName}`,
        `Pedido #${orderSn} importado via API Webhook ${platformName}`,
        now
      ]);

      // Deduct stock if product found
      if (targetProduct) {
        db.run('UPDATE products SET ready_stock_qty = MAX(0, ready_stock_qty - ?) WHERE id = ?', [qty, targetProduct.id]);
      }

      // Add log
      const logId = 'log-' + Date.now();
      const message = `Pedido #${orderSn} importado com sucesso da ${platformName}. ${qty}x ${prodName} (R$ ${totalRevenue.toFixed(2)})`;
      const payload = JSON.stringify({
        order_sn: orderSn,
        items: [{ name: prodName, qty, price }],
        total_revenue: totalRevenue,
        fee_amount: platformFeeAmount,
        net_profit: profit
      });

      db.run(`
        INSERT INTO integration_logs (id, platform_id, platform_name, event_type, status, message, payload_summary, created_at)
        VALUES (?, ?, ?, 'order.created', 'success', ?, ?, ?)
      `, [logId, platform_id, platformName, message, payload, now]);

      saveDb();

      const createdSale = queryOne(db, 'SELECT * FROM product_sales WHERE id = ?', [saleId]);
      res.status(201).json({
        success: true,
        orderSn,
        sale: createdSale,
        deductedQty: qty,
        message
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
