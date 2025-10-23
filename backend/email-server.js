  import express from 'express';
  import cors from 'cors';
  import dotenv from 'dotenv';
  import { exec } from 'child_process';
  import { promisify } from 'util';
  import path from 'path';
  import { fileURLToPath } from 'url';
  import { v4 as uuidv4 } from 'uuid';
  import { createClient } from '@supabase/supabase-js';
  import axios from 'axios';
  import fsSync from 'fs';
  import { promises as fs } from 'fs';
  import fetch from 'node-fetch';


  globalThis.fetch = fetch;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // IMPORTANTE: Cargar .env ANTES de hacer nada
  const envPath = path.join(__dirname, '.env');
  dotenv.config({ path: envPath });

  console.log('=== DEBUG ===');
  console.log('Buscando .env en:', envPath);
  console.log('¿Existe .env?', fsSync.existsSync(envPath));
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('ERROR: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
    console.error('Asegúrate de que el archivo .env existe en:', envPath);
    process.exit(1);
  }

  // AHORA crear el cliente de Supabase
  console.log('Creando cliente Supabase con URL:', process.env.SUPABASE_URL);
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('✓ Cliente Supabase creado exitosamente\n');

  const app = express();
  const PORT = 3001;
  const execPromise = promisify(exec);

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb' }));

  const createOutlookDraft = async (to, subject, body, attachments = [], replyToEmail = null) => {
      console.log('🔍 DEBUG replyToEmail:');
      console.log('   - Existe?:', !!replyToEmail);
      console.log('   - Tipo:', typeof replyToEmail);
      console.log('   - Contenido:', JSON.stringify(replyToEmail, null, 2));
    try {
      // DEBUG: Ver qué llega en replyToEmail
      if (replyToEmail) {
        console.log('   - Tiene EntryID?:', !!replyToEmail.EntryID);
        console.log('   - EntryID value:', replyToEmail.EntryID);
      }
      const fs_promises = await import('fs').then(m => m.promises);
      const tempDir = path.join(__dirname, 'temp');
      
      await fs_promises.mkdir(tempDir, { recursive: true }).catch(() => {});

      const attachmentPaths = [];

      console.log(`📎 Procesando ${attachments.length} adjuntos...`);
      console.log(`📎 Attachments recibidos:`, JSON.stringify(attachments.map(a => ({
        hasUrl: !!a.url,
        hasContent: !!a.content,
        hasFilename: !!a.filename,
        name: a.name || a.filename,
        contentLength: a.content ? a.content.length : 0
      })), null, 2));

      for (const attachment of attachments) {
        try {
          let buffer;
          let filename;

          // Si el adjunto es una URL (desde Supabase)
          if (attachment.url) {
            filename = attachment.name || 'attachment';
            console.log(`📥 Descargando desde URL: ${filename}`);
            
            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            buffer = Buffer.from(response.data);
            console.log(`✅ URL descargada: ${filename}, tamaño: ${buffer.length}`);
          } 
          // Si es un archivo en base64
          else if (attachment.content) {
            filename = attachment.filename || attachment.name || 'attachment';
            console.log(`📥 Procesando base64: ${filename}`);
            console.log(`📥 Tamaño content: ${attachment.content.length} caracteres`);
            
            buffer = Buffer.from(attachment.content, 'base64');
            console.log(`✅ Base64 procesado: ${filename}, tamaño buffer: ${buffer.length} bytes`);
          }
          else {
            console.warn(`⚠️ Adjunto sin URL ni content:`, JSON.stringify(attachment));
            continue;
          }

          const tempFilePath = path.join(tempDir, filename);
          await fs.writeFile(tempFilePath, buffer);
          attachmentPaths.push(tempFilePath);
          console.log(`💾 Adjunto guardado en: ${tempFilePath}`);
        } catch (error) {
          console.error(`❌ Error procesando adjunto:`, error.message);
          console.error(`❌ Stack:`, error.stack);
        }
      }

      console.log(`📎 Total de adjuntos guardados: ${attachmentPaths.length}`);
      console.log(`📎 Rutas de archivos:`, attachmentPaths);

      const bodyFilePath = path.join(tempDir, `body_${uuidv4()}.html`);
      await fs.writeFile(bodyFilePath, body, 'utf8');
      
      const subjectFilePath = path.join(tempDir, `subject_${uuidv4()}.txt`);
      await fs.writeFile(subjectFilePath, subject, 'utf8');
      
      const escapedTo = to.replace(/'/g, "''");
      const escapedBodyPath = bodyFilePath.replace(/\\/g, '\\\\');
      const escapedSubjectPath = subjectFilePath.replace(/\\/g, '\\\\');

      let attachmentLines = '';
      if (attachmentPaths.length > 0) {
        attachmentLines = attachmentPaths
          .map(filePath => {
            const escaped = filePath.replace(/\\/g, '\\\\');
            console.log(`📎 Añadiendo a PowerShell: ${escaped}`);
            return `$draft.Attachments.Add('${escaped}') | Out-Null`;
          })
          .join('\n');
      }

      console.log(`📜 Script PowerShell con adjuntos:\n${attachmentLines}`);

          // Si hay un email anterior, preparar los datos para responder
    let replySetup = '';
    console.log('🔍 Evaluando condición para reply:');
    console.log('   replyToEmail existe:', !!replyToEmail);
    console.log('   replyToEmail.EntryID existe:', replyToEmail ? !!replyToEmail.EntryID : 'N/A');
    
    if (replyToEmail && replyToEmail.EntryID) {
      const escapedEntryID = replyToEmail.EntryID.replace(/\\/g, '\\\\').replace(/'/g, "''");
      const escapedConversationIndex = replyToEmail.ConversationIndex || '';
      
      console.log('📧 Configurando respuesta sobre email anterior:');
      console.log('   EntryID:', escapedEntryID.substring(0, 50) + '...');
      console.log('   ConversationIndex:', escapedConversationIndex ? 'Sí' : 'No');
      
      replySetup = `
Write-Host "=== INTENTANDO CREAR RESPUESTA ==="
Write-Host "EntryID del email anterior: ${escapedEntryID.substring(0, 30)}..."

try {
  $namespace = $outlook.GetNamespace("MAPI")
  $sentItems = $namespace.GetDefaultFolder(5)
  
  Write-Host "Buscando email original en Enviados..."
  
  # Buscar por EntryID
  $originalEmail = $null
  try {
    $originalEmail = $namespace.GetItemFromID('${escapedEntryID}')
    Write-Host "Email encontrado por GetItemFromID"
  } catch {
    Write-Host "GetItemFromID falló: $($_.Exception.Message)"
    Write-Host "Intentando búsqueda manual..."
    
    # Búsqueda manual como fallback
    foreach ($item in $sentItems.Items) {
      if ($item.EntryID -eq '${escapedEntryID}') {
        $originalEmail = $item
        Write-Host "Email encontrado por búsqueda manual"
        break
      }
    }
  }
  
  if ($originalEmail) {
    Write-Host "EXITO: Email original encontrado"
    Write-Host "Asunto original: $($originalEmail.Subject)"
    Write-Host "Creando Reply..."
    
    $draft = $originalEmail.Reply()
    $draft.To = '${escapedTo}'
    
    Write-Host "Reply creado correctamente"
  } else {
    Write-Host "ADVERTENCIA: Email original no encontrado, creando email nuevo"
    $draft = $outlook.CreateItem(0)
    $draft.To = '${escapedTo}'
    $draft.Subject = [System.IO.File]::ReadAllText('${escapedSubjectPath}', [System.Text.Encoding]::UTF8)
  }
} catch {
  Write-Host "ERROR en proceso de reply: $($_.Exception.Message)"
  Write-Host "Creando email nuevo como fallback"
  $draft = $outlook.CreateItem(0)
  $draft.To = '${escapedTo}'
  $draft.Subject = [System.IO.File]::ReadAllText('${escapedSubjectPath}', [System.Text.Encoding]::UTF8)
}`;
    } else {
      console.log('📧 Creando email nuevo (sin email anterior)');
      replySetup = `Write-Host "Creando email nuevo"
      $draft = $outlook.CreateItem(0)
      $draft.To = '${escapedTo}'
      $draft.Subject = [System.IO.File]::ReadAllText('${escapedSubjectPath}', [System.Text.Encoding]::UTF8)
      `;
    }

    const psScript = `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.Office.Interop.Outlook

try {
  Write-Host "Iniciando creación de borrador..."
  
  try {
    $outlook = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Outlook.Application")
    Write-Host "Outlook conectado"
  } catch {
    $outlook = New-Object -ComObject Outlook.Application
    Write-Host "Outlook iniciado"
  }

  ${replySetup}

  Write-Host "Configurando asunto y cuerpo..."

  # Obtener el nuevo contenido
$newBody = [System.IO.File]::ReadAllText('${escapedBodyPath}', [System.Text.Encoding]::UTF8)

# Si es un Reply, mantener el historial anterior
if ($draft.HTMLBody) {
  Write-Host "Reply detectado - Concatenando con historial anterior"
  
  # Combinar: nuevo contenido + historial anterior
  $draft.HTMLBody = $newBody + $draft.HTMLBody
  
  Write-Host "Historial preservado"
} else {
  Write-Host "Email nuevo - Sin historial"
  $draft.Subject = [System.IO.File]::ReadAllText('${escapedSubjectPath}', [System.Text.Encoding]::UTF8)
  $draft.HTMLBody = $newBody
}
  
  ${attachmentLines}
  
  Write-Host "Guardando borrador..."
  $draft.Display()
  
  Write-Host "Success"
  
} catch {
  Write-Host "ERROR CRITICO: $($_.Exception.Message)"
  Write-Host "StackTrace: $($_.Exception.StackTrace)"
  exit 1
}`;

      const scriptPath = path.join(__dirname, `temp_${uuidv4()}.ps1`);
      await fs.writeFile(scriptPath, psScript, 'utf8');

      console.log('🔧 Ejecutando PowerShell...');

      const { stdout, stderr } = await execPromise(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
        { encoding: 'utf8', timeout: 30000 }
      );

      console.log(`✅ PowerShell stdout: ${stdout}`);
      if (stderr) console.log(`⚠️ PowerShell stderr: ${stderr}`);

      // Limpieza
      await fs.unlink(scriptPath).catch(() => {});
      await fs.unlink(bodyFilePath).catch(() => {});
      await fs.unlink(subjectFilePath).catch(() => {});
      for (const filePath of attachmentPaths) {
        await fs.unlink(filePath).catch(() => {});
      }

      if (stdout.includes('Success')) {
        console.log(`✅ Borrador creado para: ${to}`);
        return { success: true };
      } else {
        throw new Error(`PowerShell error: ${stdout}`);
      }

    } catch (error) {
      console.error(`❌ Error para ${to}:`, error.message);
      console.error(`❌ Stack completo:`, error.stack);
      throw error;
    }
  };

/**
 * Lee los emails del Inbox de Outlook de los últimos X días
 */
const readOutlookInbox = async (daysBack = 30) => {
  try {
    const tempDir = path.join(__dirname, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, `inbox_${uuidv4()}.json`);
    const escapedOutputPath = outputPath.replace(/\\/g, '\\\\');

    const psScript = `$ErrorActionPreference = 'Stop'

try {
  Write-Host "Conectando a Outlook..."
  
  try {
    $outlook = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Outlook.Application")
    Write-Host "Conectado a Outlook existente"
  } catch {
    Add-Type -AssemblyName Microsoft.Office.Interop.Outlook
    $outlook = New-Object -ComObject Outlook.Application
    Write-Host "Nueva instancia creada"
  }

  $namespace = $outlook.GetNamespace("MAPI")
  $namespace.Logon($null, $null, $false, $false)
  
  $inbox = $namespace.GetDefaultFolder(6)
  Write-Host "Inbox: $($inbox.Name) - Total items: $($inbox.Items.Count)"

  $dateLimit = (Get-Date).AddDays(-${daysBack})
  Write-Host "Filtrando desde: $($dateLimit.ToString('yyyy-MM-dd HH:mm:ss'))"

  $filter = "[ReceivedTime] >= '$($dateLimit.ToString('g'))'"
  $filteredItems = $inbox.Items.Restrict($filter)
  $filteredItems.Sort("[ReceivedTime]", $true)
  
  Write-Host "Items filtrados: $($filteredItems.Count)"

  $results = @()
  $processed = 0
  $maxToProcess = 1000
  
  foreach ($item in $filteredItems) {
    try {
      # 43 = MailItem, 46 = ReportItem (NDR)
      if ($item.Class -ne 43 -and $item.Class -ne 46) { 
        continue 
      }
      
      $processed++
      if ($processed -gt $maxToProcess) { break }
      
      if ($item.Class -eq 46) {
        # ReportItem (NDR - Non-Delivery Report)
        $senderEmail = "system-ndr@outlook.com"
        $senderName = "Mail Delivery System"
        
        $bodyPreview = ""
        try {
          if ($item.Body) {
            $bodyLength = [Math]::Min(2000, $item.Body.Length)
            $bodyPreview = $item.Body.Substring(0, $bodyLength)
          }
        } catch {
          $bodyPreview = ""
        }
        
        $receivedTimeStr = ""
        try {
          if ($item.ReceivedTime) {
            $receivedTimeStr = $item.ReceivedTime.ToString("yyyy-MM-dd HH:mm:ss")
          } else {
            $receivedTimeStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
          }
        } catch {
          $receivedTimeStr = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
        
        $results += [PSCustomObject]@{
          Subject = if ($item.Subject) { $item.Subject } else { "" }
          SenderName = $senderName
          SenderEmail = $senderEmail
          SenderEmailType = "ReportItem"
          ReceivedTime = $receivedTimeStr
          Body = $bodyPreview
          ConversationTopic = if ($item.ConversationTopic) { $item.ConversationTopic } else { "" }
          ItemType = "ReportItem"
          ItemClass = 46
        }
        
      } else {
        # MailItem normal
        $senderEmail = ""
        $senderName = ""
        
        try {
          $senderName = $item.SenderName
          
          if ($item.SenderEmailType -eq "EX") {
            try {
              $sender = $item.Sender
              if ($sender -and $sender.AddressEntry) {
                $exchangeUser = $sender.AddressEntry.GetExchangeUser()
                if ($exchangeUser -and $exchangeUser.PrimarySmtpAddress) {
                  $senderEmail = $exchangeUser.PrimarySmtpAddress
                }
              }
              
              if ([string]::IsNullOrEmpty($senderEmail)) {
                $senderEmail = $item.SenderEmailAddress
              }
            } catch {
              $senderEmail = $item.SenderEmailAddress
            }
          } else {
            $senderEmail = $item.SenderEmailAddress
          }
        } catch {
          $senderEmail = "unknown@domain.com"
          $senderName = "Unknown"
        }
        
        $bodyPreview = ""
        try {
          if ($item.Body) {
            $bodyLength = [Math]::Min(500, $item.Body.Length)
            $bodyPreview = $item.Body.Substring(0, $bodyLength)
          }
        } catch {
          $bodyPreview = ""
        }
        
        $results += [PSCustomObject]@{
          Subject = $item.Subject
          SenderName = $senderName
          SenderEmail = $senderEmail
          SenderEmailType = $item.SenderEmailType
          ReceivedTime = $item.ReceivedTime.ToString("yyyy-MM-dd HH:mm:ss")
          Body = $bodyPreview
          ConversationTopic = $item.ConversationTopic
          ItemType = "MailItem"
          ItemClass = 43
        }
      }
      
    } catch {
      Write-Host "Error procesando item: $_"
    }
  }

  Write-Host "Total procesados: $($results.Count)"
  
  $mailItems = ($results | Where-Object { $_.ItemClass -eq 43 }).Count
  $reportItems = ($results | Where-Object { $_.ItemClass -eq 46 }).Count
  Write-Host "  - MailItems: $mailItems"
  Write-Host "  - ReportItems (NDR): $reportItems"

  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  if ($results.Count -eq 0) {
    [System.IO.File]::WriteAllText('${escapedOutputPath}', '[]', $utf8NoBom)
  } else {
    $json = $results | ConvertTo-Json -Depth 3 -Compress
    [System.IO.File]::WriteAllText('${escapedOutputPath}', $json, $utf8NoBom)
  }

  Write-Host "Success"
  
} catch {
  Write-Host "ERROR: $_"
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText('${escapedOutputPath}', '[]', $utf8NoBom)
  exit 1
}`;

    const scriptPath = path.join(tempDir, `read_inbox_${uuidv4()}.ps1`);
    await fs.writeFile(scriptPath, psScript, 'utf8');

    console.log('🔍 Leyendo Inbox de Outlook...');
    console.log(`📅 Últimos ${daysBack} días`);

    const { stdout, stderr } = await execPromise(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { encoding: 'utf8', timeout: 120000 }
    );

    console.log('📤 PowerShell output:');
    console.log(stdout);
    
    if (stderr && !stderr.includes('WARNING')) {
      console.log('⚠️ Stderr:', stderr);
    }

    if (!fsSync.existsSync(outputPath)) {
      console.error('❌ Archivo no generado');
      await fs.unlink(scriptPath).catch(() => {});
      return [];
    }

    const buffer = await fs.readFile(outputPath);
    
    let data;
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      console.log('🧹 BOM detectado y eliminado');
      data = buffer.slice(3).toString('utf8');
    } else {
      data = buffer.toString('utf8');
    }

    console.log('📄 Tamaño del contenido:', data.length, 'bytes');

    let emails = [];
    
    try {
      emails = JSON.parse(data);
      console.log(`✅ ${emails.length} emails parseados correctamente`);
      
      if (emails.length > 0) {
        const mailItems = emails.filter(e => e.ItemType === 'MailItem').length;
        const reportItems = emails.filter(e => e.ItemType === 'ReportItem').length;
        
        console.log(`📊 Resumen:`);
        console.log(`  - MailItems: ${mailItems}`);
        console.log(`  - ReportItems (NDR): ${reportItems}`);
        
        if (reportItems > 0) {
          console.log(`⚠️ Se detectaron ${reportItems} email(s) de error (NDR)`);
        }
      }
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError.message);
      console.error('📄 Primeros 100 caracteres:', data.substring(0, 100));
      emails = [];
    }

    await fs.unlink(scriptPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    return Array.isArray(emails) ? emails : [];

  } catch (err) {
    console.error('❌ Error leyendo inbox:', err.message);
    return [];
  }
};
/**
 * Busca el último email enviado a un contacto específico en la carpeta Enviados
 * @param {string} contactEmail - Email del contacto
 * @param {number} daysBack - Días hacia atrás para buscar
 * @returns {Object|null} - Información del email encontrado o null
 */
const findLastSentEmail = async (contactEmail, daysBack = 60) => {
  try {
    const tempDir = path.join(__dirname, 'temp');
    await fs.mkdir(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, `sent_${uuidv4()}.json`);
    const escapedOutputPath = outputPath.replace(/\\/g, '\\\\');
    const normalizedEmail = contactEmail.toLowerCase().trim();

    const psScript = `$ErrorActionPreference = 'Stop'

try {
  Write-Host "Buscando email anterior a: ${normalizedEmail}"
  
  try {
    $outlook = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Outlook.Application")
  } catch {
    Add-Type -AssemblyName Microsoft.Office.Interop.Outlook
    $outlook = New-Object -ComObject Outlook.Application
  }

  $namespace = $outlook.GetNamespace("MAPI")
  $sentItems = $namespace.GetDefaultFolder(5)
  
  Write-Host "Carpeta Enviados: $($sentItems.Name)"
  Write-Host "Items en Enviados: $($sentItems.Items.Count)"
  
  # Buscar en los últimos emails enviados
  $items = $sentItems.Items
  $items.Sort("[SentOn]", $true)
  
  $foundEmail = $null
  $checkedCount = 0
  $maxToCheck = 200
  
  foreach ($item in $items) {
    try {
      if ($item.Class -ne 43) { continue }
      
      $checkedCount++
      if ($checkedCount -gt $maxToCheck) { break }
      
      # Verificar si es para el contacto
      $toRecipients = $item.To.ToLower()
      
      if ($toRecipients -like "*${normalizedEmail}*") {
        Write-Host "Email encontrado: $($item.Subject)"
        Write-Host "Fecha: $($item.SentOn)"
        
        # Convertir ConversationIndex de forma segura
        $convIndexBase64 = ""
        try {
          if ($item.ConversationIndex) {
            # El ConversationIndex ya es un byte array
            $convIndexBase64 = [System.Convert]::ToBase64String($item.ConversationIndex)
          }
        } catch {
          Write-Host "No se pudo convertir ConversationIndex (no crítico)"
        }
        
        $foundEmail = [PSCustomObject]@{
          EntryID = $item.EntryID
          ConversationID = if ($item.ConversationID) { $item.ConversationID } else { "" }
          ConversationIndex = $convIndexBase64
          Subject = $item.Subject
          SentOn = $item.SentOn.ToString("yyyy-MM-dd HH:mm:ss")
          To = $item.To
        }
        break
      }
      
    } catch {
      # Error procesando un item individual - continuar con el siguiente
      continue
    }
  }
  
  Write-Host "Total emails revisados: $checkedCount"
  
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  if ($foundEmail) {
    $json = $foundEmail | ConvertTo-Json -Depth 3 -Compress
    [System.IO.File]::WriteAllText('${escapedOutputPath}', $json, $utf8NoBom)
    Write-Host "Success: Email encontrado"
  } else {
    [System.IO.File]::WriteAllText('${escapedOutputPath}', 'null', $utf8NoBom)
    Write-Host "Success: No se encontró email anterior"
  }
  
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText('${escapedOutputPath}', 'null', $utf8NoBom)
  exit 1
}`;

    const scriptPath = path.join(tempDir, `find_sent_${uuidv4()}.ps1`);
    await fs.writeFile(scriptPath, psScript, 'utf8');

    console.log(`🔍 Buscando email anterior a: ${contactEmail}`);

    const { stdout, stderr } = await execPromise(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { encoding: 'utf8', timeout: 90000 }
    );

    console.log('📤 PowerShell output:', stdout);

    if (!fsSync.existsSync(outputPath)) {
      console.error('❌ Archivo no generado');
      await fs.unlink(scriptPath).catch(() => {});
      return null;
    }

    const buffer = await fs.readFile(outputPath);
    let data;
    if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      data = buffer.slice(3).toString('utf8');
    } else {
      data = buffer.toString('utf8');
    }

    await fs.unlink(scriptPath).catch(() => {});
    await fs.unlink(outputPath).catch(() => {});

    if (data === 'null') {
      console.log('⚠️ No se encontró email anterior');
      return null;
    }

    const emailInfo = JSON.parse(data);
    console.log(`✅ Email anterior encontrado:`);
    console.log(`   Asunto: ${emailInfo.Subject}`);
    console.log(`   Fecha: ${emailInfo.SentOn}`);
    
    return emailInfo;

  } catch (err) {
    console.error('❌ Error buscando email anterior:', err.message);
    return null;
  }
};
/**
 * Verifica si un contacto específico ha respondido
 * Maneja formatos Exchange y SMTP
 */
const checkContactReplies = (emails, contactEmail) => {
  if (!Array.isArray(emails) || emails.length === 0) {
    console.log('⚠️ No hay emails para verificar');
    return { 
      hasReplied: false, 
      replyCount: 0, 
      lastReplyDate: null, 
      replies: [] 
    };
  }

  if (!contactEmail || typeof contactEmail !== 'string') {
    console.log('⚠️ Email del contacto inválido:', contactEmail);
    return { 
      hasReplied: false, 
      replyCount: 0, 
      lastReplyDate: null, 
      replies: [] 
    };
  }

  const normalizedContactEmail = contactEmail.toLowerCase().trim();
  console.log(`🔍 Buscando respuestas de: ${normalizedContactEmail}`);

  const replies = emails.filter(email => {
    if (!email || !email.SenderEmail) {
      return false;
    }

    const senderEmail = (email.SenderEmail || '').toLowerCase().trim();
    
    // Si no hay email válido, intentar con el nombre
    if (senderEmail === 'unknown@domain.com' || senderEmail.length < 5) {
      return false;
    }
    
    // Extraer la parte del email antes de @
    const contactUsername = normalizedContactEmail.split('@')[0];
    const senderUsername = senderEmail.split('@')[0];
    
    // Extraer dominio
    const contactDomain = normalizedContactEmail.split('@')[1] || '';
    const senderDomain = senderEmail.split('@')[1] || '';
    
    // Comparaciones múltiples para mayor precisión
    const matches = 
      // Match exacto
      senderEmail === normalizedContactEmail ||
      // Match por username
      (contactUsername.length > 3 && senderUsername.includes(contactUsername)) ||
      (senderUsername.length > 3 && contactUsername.includes(senderUsername)) ||
      // Match por dominio y username parcial
      (contactDomain === senderDomain && 
       contactUsername.length > 3 && 
       senderUsername.includes(contactUsername)) ||
      // Match general (más permisivo)
      (senderEmail.includes(contactUsername) && senderEmail.includes(contactDomain));
    
    if (matches) {
      console.log(`✅ Match encontrado:`);
      console.log(`   Contacto: ${normalizedContactEmail}`);
      console.log(`   Remitente: ${senderEmail}`);
      console.log(`   Asunto: ${email.Subject}`);
    }
    
    return matches;
  });

  const result = {
    hasReplied: replies.length > 0,
    replyCount: replies.length,
    lastReplyDate: replies.length > 0
      ? replies.sort((a, b) => 
          new Date(b.ReceivedTime).getTime() - new Date(a.ReceivedTime).getTime()
        )[0].ReceivedTime
      : null,
    replies: replies.map(r => ({
      subject: r.Subject || 'Sin asunto',
      date: r.ReceivedTime,
      preview: (r.Body || '').substring(0, 200),
      senderEmail: r.SenderEmail,
      senderName: r.SenderName || 'Desconocido'
    }))
  };

  if (result.hasReplied) {
    console.log(`📊 ${normalizedContactEmail}: ${result.replyCount} respuesta(s), última el ${result.lastReplyDate}`);
  } else {
    console.log(`📊 ${normalizedContactEmail}: Sin respuestas`);
  }

  return result;
};

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      server: 'Email server running',
      method: 'PowerShell + Outlook COM'
    });
  });

  app.post('/api/draft-email', async (req, res) => {
  console.log('\n📨 === NUEVA PETICIÓN /api/draft-email ===');
  
  try {
    const { to, subject, body, attachments = [], contactEmail } = req.body;
    console.log('📋 Datos recibidos:', { 
      to, 
      subject: subject?.substring(0, 50),
      attachmentsCount: attachments.length,
      hasContactEmail: contactEmail ? true : false
    });

      if (!to || !subject || !body) {
        console.error('❌ Faltan parámetros: to, subject o body');
        return res.status(400).json({ error: 'Missing to, subject or body' });
      }
      
      // Buscar email anterior si se proporciona contactEmail
      let replyToEmail = null;
      if (contactEmail) {
        console.log(`🔍 Buscando email anterior a: ${contactEmail}`);
        replyToEmail = await findLastSentEmail(contactEmail, 60);
        
        if (replyToEmail) {
          console.log(`✅ Se responderá sobre: "${replyToEmail.Subject}"`);
        } else {
          console.log(`ℹ️ No se encontró email anterior, se creará nuevo hilo`);
        }
      }

      console.log(`📝 Creando borrador para: ${to}`);
      console.log('🔍 DEBUG antes de createOutlookDraft:');
      console.log('   replyToEmail:', replyToEmail);
      console.log('   replyToEmail es null?:', replyToEmail === null);

      const result = await createOutlookDraft(to, subject, body, attachments, replyToEmail);

      console.log('✅ Borrador creado exitosamente');
      res.json({
        success: true,
        message: 'Draft created in Outlook',
        to: to,
        attachmentsCount: attachments.length,
        isReply: replyToEmail ? true : false
      });

    } catch (error) {
      console.error('💥 Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/draft-emails-batch', async (req, res) => {
    try {
      const { emails } = req.body;

      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'Email array required' });
      }

      console.log(`📨 Creando ${emails.length} borradores...`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const email of emails) {
        try {
          const { to, subject, body, attachments = [] } = email;

          if (!to || !subject || !body) {
            results.push({ to, status: 'error', message: 'Missing fields' });
            errorCount++;
            continue;
          }

          await createOutlookDraft(to, subject, body, attachments);
          results.push({ to, status: 'success' });
          successCount++;

          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          results.push({
            to: email.to,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: `${successCount} borradores creados, ${errorCount} errores`,
        successCount: successCount,
        errorCount: errorCount,
        totalCount: emails.length,
        details: results
      });

    } catch (error) {
      console.error('Error en batch:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get('/api/webinars/list-pdfs', async (req, res) => {
    try {
      const fs_promises = await import('fs').then(m => m.promises);
      const webinarsDir = path.join(__dirname, '..', 'Webinars');

      console.log('Buscando PDFs en:', webinarsDir);

      try {
        await fs_promises.mkdir(webinarsDir, { recursive: true });
      } catch (e) {
        console.warn('Carpeta Webinars existe o no se pudo crear');
      }

      const files = await fs_promises.readdir(webinarsDir);
      const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));

      console.log(`PDFs encontrados: ${pdfs.length}`);

      res.json({
        success: true,
        pdfs: pdfs,
        folder: webinarsDir
      });
    } catch (error) {
      console.error('Error listing PDFs:', error);
      res.status(500).json({
        error: 'Error listing PDFs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /api/outlook/inbox
   * Lee todos los emails del inbox de los últimos X días
   */
  app.get('/api/outlook/inbox', async (req, res) => {
    try {
      const daysBack = typeof req.query.days === 'string' ? parseInt(req.query.days) : 30;
      console.log(`📬 Leyendo inbox de los últimos ${daysBack} días...`);
      
      const emails = await readOutlookInbox(daysBack);
      
      res.json({
        success: true,
        count: emails.length,
        daysBack,
        emails
      });
    } catch (error) {
      console.error('Error leyendo inbox:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  /**
   * POST /api/outlook/check-replies
   * Verifica si contactos específicos han respondido
   * Body: { contacts: [{ id: string, email: string }] }
   */
  app.post('/api/outlook/check-replies', async (req, res) => {
  try {
    const { contacts, daysBack = 30 } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Contacts array required' });
    }

    const emails = await readOutlookInbox(daysBack);

    const results = contacts.map(contact => {
      const replyInfo = checkContactReplies(emails, contact.email);
      return {
        contactId: contact.id,
        email: contact.email,
        name: contact.name,
        ...replyInfo
      };
    });

    const repliedCount = results.filter(r => r.hasReplied).length;

    res.json({
      success: true,
      totalContacts: contacts.length,
      repliedCount,
      notRepliedCount: contacts.length - repliedCount,
      results
    });
  } catch (error) {
    console.error('Error verificando respuestas:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

  /**
 * POST /api/campaigns/check-all-replies
 * Verifica respuestas de todos los contactos en campañas activas
 * Actualiza has_replied y last_reply_date en Supabase
 */
app.post('/api/campaigns/check-all-replies', async (req, res) => {
  try {
    const { daysBack = 30 } = req.body;

    console.log('📊 Obteniendo campañas de Supabase...');

    // Obtener TODAS las campañas (no solo activas)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, contact_id, start_campaign, contacts(id, email, first_name, last_name)');

    if (campaignsError) {
      console.error('❌ Error obteniendo campañas:', campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('⚠️ No hay campañas en la base de datos');
      return res.json({
        success: true,
        message: 'No hay campañas',
        totalCampaigns: 0,
        repliedCount: 0
      });
    }

    console.log(`📬 Verificando ${campaigns.length} campañas...`);

    // Leer inbox una sola vez
    console.log('📥 Leyendo inbox de Outlook...');
    const emails = await readOutlookInbox(daysBack);
    console.log(`📧 Total emails leídos: ${emails.length}`);

    if (emails.length === 0) {
      console.log('⚠️ No se encontraron emails en el inbox');
      return res.json({
        success: true,
        message: 'No hay emails en el inbox',
        totalCampaigns: campaigns.length,
        repliedCount: 0
      });
    }

    let updatedCount = 0;
    let errorCount = 0;
    const results = [];

    for (const campaign of campaigns) {
      const contact = campaign.contacts;
      
      if (!contact || !contact.email) {
        console.log(`⚠️ Campaña ${campaign.id}: sin contacto válido`);
        results.push({
          campaignId: campaign.id,
          error: 'No contact email'
        });
        errorCount++;
        continue;
      }

      console.log(`\n🔍 Verificando: ${contact.first_name} ${contact.last_name} (${contact.email})`);

      const replyInfo = checkContactReplies(emails, contact.email);

      // Siempre actualizar en Supabase (incluso si no ha respondido)
      const updateData = {
        has_replied: replyInfo.hasReplied,
        last_reply_date: replyInfo.lastReplyDate
      };

      console.log(`💾 Actualizando campaña ${campaign.id}:`, updateData);

      const { data: updateResult, error: updateError } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', campaign.id)
        .select();

      if (updateError) {
        console.error(`❌ Error actualizando campaña ${campaign.id}:`, updateError);
        results.push({
          campaignId: campaign.id,
          contactName: `${contact.first_name} ${contact.last_name}`,
          contactEmail: contact.email,
          error: updateError.message,
          ...replyInfo
        });
        errorCount++;
      } else {
        console.log(`✅ Campaña ${campaign.id} actualizada exitosamente`);
        if (replyInfo.hasReplied) {
          updatedCount++;
          console.log(`   📨 ${replyInfo.replyCount} respuesta(s) encontrada(s)`);
        } else {
          console.log(`   ⭕ Sin respuestas`);
        }

        results.push({
          campaignId: campaign.id,
          contactName: `${contact.first_name} ${contact.last_name}`,
          contactEmail: contact.email,
          updated: true,
          ...replyInfo
        });
      }
    }

    console.log(`\n✅ Proceso completado:`);
    console.log(`   Total campañas: ${campaigns.length}`);
    console.log(`   Con respuestas: ${updatedCount}`);
    console.log(`   Sin respuestas: ${campaigns.length - updatedCount - errorCount}`);
    console.log(`   Errores: ${errorCount}`);

    res.json({
      success: true,
      totalCampaigns: campaigns.length,
      repliedCount: updatedCount,
      notRepliedCount: campaigns.length - updatedCount - errorCount,
      errorCount: errorCount,
      results
    });

  } catch (error) {
    console.error('💥 Error en check-all-replies:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

  app.listen(PORT, () => {
    console.log(`\n✅ Servidor de email ejecutándose en http://localhost:${PORT}`);
    console.log('\nEndpoints disponibles:');
    console.log('  POST /api/draft-email - Crear un borrador');
    console.log('  POST /api/draft-emails-batch - Crear múltiples borradores');
    console.log('  GET /api/health - Health check');
    console.log('  POST /api/campaigns/check-all-replies - Revisar respuestas\n');

  });