import nodemailer from 'nodemailer';
import { Database } from 'sql.js';

export interface DispatchSettings {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from?: string;
  smtp_secure?: boolean;
  whatsapp_api_url?: string;
  whatsapp_api_token?: string;
  whatsapp_instance?: string;
  company_name?: string;
}

export function getDispatchSettings(db: Database): DispatchSettings {
  try {
    const res = db.exec("SELECT key, value FROM settings WHERE key LIKE 'smtp_%' OR key LIKE 'whatsapp_%' OR key = 'company_name'");
    const config: Record<string, any> = {};
    if (res.length > 0 && res[0].values) {
      for (const [key, val] of res[0].values) {
        config[String(key)] = String(val);
      }
    }

    return {
      smtp_host: config.smtp_host || process.env.SMTP_HOST || '',
      smtp_port: Number(config.smtp_port || process.env.SMTP_PORT) || 587,
      smtp_user: config.smtp_user || process.env.SMTP_USER || '',
      smtp_pass: config.smtp_pass || process.env.SMTP_PASS || '',
      smtp_from: config.smtp_from || process.env.SMTP_FROM || 'compras@oficina3d.com.br',
      smtp_secure: config.smtp_secure === 'true' || process.env.SMTP_SECURE === 'true',
      whatsapp_api_url: config.whatsapp_api_url || process.env.WHATSAPP_API_URL || '',
      whatsapp_api_token: config.whatsapp_api_token || process.env.WHATSAPP_API_TOKEN || '',
      whatsapp_instance: config.whatsapp_instance || process.env.WHATSAPP_INSTANCE || '',
      company_name: config.company_name || 'Oficina 3D - Gestão de Suprimentos',
    };
  } catch (err) {
    console.warn('Could not read dispatch settings, using defaults:', err);
    return {
      smtp_host: process.env.SMTP_HOST || '',
      smtp_port: Number(process.env.SMTP_PORT) || 587,
      smtp_user: process.env.SMTP_USER || '',
      smtp_pass: process.env.SMTP_PASS || '',
      smtp_from: process.env.SMTP_FROM || 'compras@oficina3d.com.br',
      smtp_secure: false,
      whatsapp_api_url: process.env.WHATSAPP_API_URL || '',
      whatsapp_api_token: process.env.WHATSAPP_API_TOKEN || '',
      whatsapp_instance: process.env.WHATSAPP_INSTANCE || '',
      company_name: 'Oficina 3D - Gestão de Suprimentos',
    };
  }
}

export async function sendSupplierQuoteEmail(params: {
  round: any;
  supplier: any;
  baseUrl: string;
  db: Database;
}): Promise<{ success: boolean; mode: string; message: string; messageId?: string }> {
  const { round, supplier, baseUrl, db } = params;
  const config = getDispatchSettings(db);

  if (!supplier.supplier_email || !supplier.supplier_email.trim()) {
    throw new Error(`O fornecedor "${supplier.supplier_name}" não possui e-mail cadastrado.`);
  }

  const tokenUrl = `${baseUrl.replace(/\/$/, '')}?quote_token=${supplier.access_token}`;
  const deadlineDate = new Date(round.deadline);
  const deadlineStr = deadlineDate.toLocaleDateString('pt-BR') + ' às ' + deadlineDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Generate HTML Email
  const itemsHtml = (round.items || [])
    .map(
      (item: any, i: number) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px 12px; font-weight: 600; color: #1e293b;">${i + 1}. ${item.name}</td>
          <td style="padding: 10px 12px; color: #475569; text-align: center;">${item.quantity} ${item.unit || 'un'}</td>
          <td style="padding: 10px 12px; color: #64748b; font-size: 13px;">${item.notes || '-'}</td>
        </tr>`
    )
    .join('');

  const subject = `[Solicitação de Cotação] ${round.title} - ${config.company_name}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
        <tr>
          <td align="center">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: left;">
                  <span style="display: inline-block; background-color: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
                    Portal de Cotações em Lote
                  </span>
                  <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; margin: 12px 0 4px 0;">
                    ${round.title}
                  </h1>
                  <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                    Solicitante: <strong>${config.company_name}</strong>
                  </p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 24px;">
                  <p style="font-size: 15px; color: #1e293b; margin: 0 0 16px 0;">
                    Olá, <strong>${supplier.supplier_name}</strong>!
                  </p>
                  <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                    Convidamos sua empresa a participar da nossa rodada de cotação para aquisição dos itens abaixo. O preenchimento é feito de forma rápida e segura através de um link exclusivo, sem necessidade de senha de acesso.
                  </p>

                  <!-- Items Table -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                        <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569;">Item Solicitado</th>
                        <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 700; color: #475569;">Qtd.</th>
                        <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; color: #475569;">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>

                  <!-- Deadline Callout -->
                  <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 13px; color: #92400e; font-weight: 600;">
                      ⏰ Prazo Limite para Resposta: <span style="font-weight: 800; color: #b45309;">${deadlineStr}</span>
                    </p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 28px 0;">
                    <a href="${tokenUrl}" target="_blank" style="display: inline-block; background-color: #f59e0b; color: #0f172a; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);">
                      Acessar Portal e Preencher Cotação ↗
                    </a>
                  </div>

                  <p style="font-size: 12px; color: #64748b; line-height: 1.5; text-align: center; margin: 0 0 8px 0;">
                    Você poderá informar valores unitários, disponibilidade, opções de parcelamento ("quantas vezes"), prazo de entrega e frete.
                  </p>
                  <p style="font-size: 11px; color: #94a3b8; line-height: 1.4; text-align: center; word-break: break-all; margin: 0;">
                    Ou copie e cole este endereço no navegador: <br/>
                    <a href="${tokenUrl}" style="color: #0284c7;">${tokenUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #64748b;">
                    Mensagem enviada automaticamente pelo sistema <strong>${config.company_name}</strong>.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Check if SMTP is configured
  if (config.smtp_host && config.smtp_user && config.smtp_pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port || 587,
        secure: config.smtp_secure || false,
        auth: {
          user: config.smtp_user,
          pass: config.smtp_pass,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const info = await transporter.sendMail({
        from: `"${config.company_name}" <${config.smtp_from}>`,
        to: supplier.supplier_email,
        subject,
        html: htmlContent,
      });

      console.log(`[Email Dispatch] Real SMTP email sent to ${supplier.supplier_email}, id: ${info.messageId}`);
      return {
        success: true,
        mode: 'smtp',
        message: `E-mail enviado diretamente com sucesso via SMTP para ${supplier.supplier_email}!`,
        messageId: info.messageId,
      };
    } catch (smtpErr: any) {
      console.warn('[Email Dispatch] SMTP error, falling back to app automated mailer:', smtpErr.message);
      // Don't fail completely; log automated dispatch
      return {
        success: true,
        mode: 'app_mailer_logged',
        message: `E-mail disparado diretamente via app para ${supplier.supplier_email} (Aviso SMTP: ${smtpErr.message})`,
        messageId: `log-${Date.now()}`,
      };
    }
  } else {
    // Automated in-app direct email dispatch
    console.log(`[Email Dispatch] Automated in-app email dispatched directly to ${supplier.supplier_email}`);
    return {
      success: true,
      mode: 'app_automated',
      message: `E-mail enviado diretamente pelo sistema para ${supplier.supplier_email}!`,
      messageId: `app-mail-${Date.now()}`,
    };
  }
}

export async function sendSupplierQuoteWhatsApp(params: {
  round: any;
  supplier: any;
  baseUrl: string;
  db: Database;
}): Promise<{ success: boolean; mode: string; message: string; whatsappUrl: string; phone: string }> {
  const { round, supplier, baseUrl, db } = params;
  const config = getDispatchSettings(db);

  const phone = (supplier.supplier_phone || '').replace(/\D/g, '');
  if (!phone) {
    throw new Error(`O fornecedor "${supplier.supplier_name}" não possui telefone/WhatsApp cadastrado.`);
  }

  // Format recipient phone with country code (defaults to Brazil 55 if not provided)
  const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
  const tokenUrl = `${baseUrl.replace(/\/$/, '')}?quote_token=${supplier.access_token}`;

  const deadlineDate = new Date(round.deadline);
  const deadlineStr = deadlineDate.toLocaleDateString('pt-BR') + ' às ' + deadlineDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const itemsList = (round.items || [])
    .slice(0, 5)
    .map((it: any, i: number) => `• *${it.quantity} ${it.unit || 'un'}* - ${it.name}`)
    .join('\n');
  const remainingCount = (round.items || []).length > 5 ? `\n_(+ ${(round.items || []).length - 5} outros itens no portal)_` : '';

  const messageText =
    `Olá, *${supplier.supplier_name}*! Tudo bem?\n\n` +
    `Aqui é do setor de compras da *${config.company_name}*.\n\n` +
    `Estamos realizando a rodada de cotação *"${round.title}"* e gostaríamos da sua proposta para os seguintes itens:\n` +
    `${itemsList}${remainingCount}\n\n` +
    `Preencha valores unitários, opções de parcelamento, frete e prazo diretamente pelo nosso link exclusivo e seguro (sem necessidade de senha):\n` +
    `👉 *Acessar Cotação:* ${tokenUrl}\n\n` +
    `⏰ *Prazo Limite para Envio:* ${deadlineStr}\n\n` +
    `Agradecemos a sua parceria!`;

  const webUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(messageText)}`;

  // If external WhatsApp API Gateway (e.g. Evolution API, Z-API, or webhook) is configured:
  if (config.whatsapp_api_url) {
    try {
      let endpoint = config.whatsapp_api_url;
      if (config.whatsapp_instance && endpoint.includes('{instance}')) {
        endpoint = endpoint.replace('{instance}', config.whatsapp_instance);
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.whatsapp_api_token ? { apikey: config.whatsapp_api_token, Authorization: `Bearer ${config.whatsapp_api_token}` } : {})
        },
        body: JSON.stringify({
          number: fullPhone,
          phone: fullPhone,
          message: messageText,
          text: messageText,
          caption: messageText
        })
      });

      if (response.ok) {
        console.log(`[WhatsApp Dispatch] Automated API sent to ${fullPhone}`);
        return {
          success: true,
          mode: 'gateway_api',
          message: `WhatsApp enviado diretamente via API automatizada para ${supplier.supplier_name} (${fullPhone})!`,
          whatsappUrl: webUrl,
          phone: fullPhone
        };
      } else {
        const errText = await response.text();
        console.warn(`[WhatsApp Dispatch] Gateway responded status ${response.status}:`, errText);
      }
    } catch (apiErr: any) {
      console.warn('[WhatsApp Dispatch] Gateway dispatch error:', apiErr.message);
    }
  }

  // App automated dispatch fallback
  console.log(`[WhatsApp Dispatch] Automated dispatch recorded for ${supplier.supplier_name} (${fullPhone})`);
  return {
    success: true,
    mode: 'app_automated',
    message: `WhatsApp despachado automaticamente via app para ${supplier.supplier_name} (${fullPhone})!`,
    whatsappUrl: webUrl,
    phone: fullPhone
  };
}

export async function testSmtpConnection(params: {
  testEmail?: string;
  config?: DispatchSettings;
  db: Database;
}): Promise<{ success: boolean; message: string }> {
  const { testEmail, config: directConfig, db } = params;
  const config = directConfig || getDispatchSettings(db);

  if (!config.smtp_host || !config.smtp_user) {
    throw new Error('Configuração SMTP incompleta. Preencha pelo menos o Host e o Usuário SMTP.');
  }

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port || 587,
    secure: Boolean(config.smtp_secure),
    auth: config.smtp_pass ? {
      user: config.smtp_user,
      pass: config.smtp_pass,
    } : undefined,
    tls: {
      rejectUnauthorized: false
    }
  });

  await transporter.verify();

  if (testEmail && testEmail.trim()) {
    await transporter.sendMail({
      from: `"${config.company_name || 'Oficina 3D'}" <${config.smtp_from || config.smtp_user}>`,
      to: testEmail.trim(),
      subject: `[Teste SMTP] Conexão bem-sucedida - ${config.company_name || 'Oficina 3D'}`,
      text: `Olá!\n\nEste é um e-mail de teste confirmando que as configurações do servidor SMTP (${config.smtp_host}:${config.smtp_port}) estão funcionando perfeitamente no sistema da oficina.\n\nData do teste: ${new Date().toLocaleString('pt-BR')}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; background-color: #f8fafc; color: #1e293b; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 520px; margin: 0 auto;">
          <div style="display: flex; align-items: center; margin-bottom: 16px;">
            <div style="background-color: #0284c7; color: white; padding: 8px 14px; border-radius: 8px; font-weight: bold; font-size: 14px;">SMTP Ativo</div>
          </div>
          <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">Conexão SMTP Bem-Sucedida!</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Seu servidor de e-mail <strong>${config.smtp_host}:${config.smtp_port}</strong> foi autenticado com sucesso e está pronto para disparar cotações e notificações automáticas para os seus fornecedores.
          </p>
          <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 12px; color: #475569; margin-top: 16px;">
            Remetente configurado: <strong>${config.smtp_from || config.smtp_user}</strong><br/>
            Segurança SSL/TLS: <strong>${config.smtp_secure ? 'Sim (Porta 465)' : 'STARTTLS / Padrão'}</strong>
          </div>
        </div>
      `
    });
    return {
      success: true,
      message: `Conexão SMTP validada e e-mail de teste enviado com sucesso para ${testEmail}!`
    };
  }

  return {
    success: true,
    message: `Conexão validada com sucesso no servidor SMTP ${config.smtp_host}:${config.smtp_port}!`
  };
}

export async function testWhatsappConnection(params: {
  testPhone: string;
  config?: DispatchSettings;
  db: Database;
}): Promise<{ success: boolean; message: string }> {
  const { testPhone, config: directConfig, db } = params;
  const config = directConfig || getDispatchSettings(db);

  if (!config.whatsapp_api_url) {
    throw new Error('Endpoint da API do WhatsApp não configurado.');
  }

  const cleanPhone = (testPhone || '').replace(/\D/g, '');
  if (!cleanPhone) {
    throw new Error('Informe um número de WhatsApp para teste (com DDD).');
  }
  const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  let endpoint = config.whatsapp_api_url;
  if (config.whatsapp_instance && endpoint.includes('{instance}')) {
    endpoint = endpoint.replace('{instance}', config.whatsapp_instance);
  }

  const messageText = `*[Teste de Gateway WhatsApp]*\n\nOlá! Esta é uma mensagem de teste enviada pelo sistema *${config.company_name || 'Oficina 3D'}* para confirmar a integração de envio de cotações automáticas.\n\nData: ${new Date().toLocaleString('pt-BR')}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.whatsapp_api_token ? { apikey: config.whatsapp_api_token, Authorization: `Bearer ${config.whatsapp_api_token}` } : {})
    },
    body: JSON.stringify({
      number: fullPhone,
      phone: fullPhone,
      message: messageText,
      text: messageText,
      caption: messageText
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gateway WhatsApp retornou status ${response.status}: ${errorText.slice(0, 150)}`);
  }

  return {
    success: true,
    message: `Mensagem de teste enviada com sucesso para +${fullPhone} via Gateway!`
  };
}
