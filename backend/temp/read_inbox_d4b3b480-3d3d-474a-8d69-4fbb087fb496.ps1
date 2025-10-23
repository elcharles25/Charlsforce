$ErrorActionPreference = 'Stop'

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

  $dateLimit = (Get-Date).AddDays(-30)
  Write-Host "Filtrando desde: $($dateLimit.ToString('yyyy-MM-dd HH:mm:ss'))"

  $filter = "[ReceivedTime] >= '$($dateLimit.ToString('g'))'"
  $filteredItems = $inbox.Items.Restrict($filter)
  $filteredItems.Sort("[ReceivedTime]", $true)
  
  Write-Host "Items filtrados: $($filteredItems.Count)"

  $results = @()
  $processed = 0
  $maxToProcess = 1000

    # CONTADORES DE DEBUG
  $classStats = @{}
  
  foreach ($item in $filteredItems) {
    try {
      # REGISTRAR TODOS LOS TIPOS DE CLASS
      $classType = $item.Class
      if ($classStats.ContainsKey($classType)) {
        $classStats[$classType]++
      } else {
        $classStats[$classType] = 1
      }
      
      # MOSTRAR LOS PRIMEROS 10 ITEMS DE CUALQUIER TIPO
      if ($processed -lt 10) {
        Write-Host "Item $($processed + 1): Class=$classType, Subject='$($item.Subject)'"
      }
      
      # 43 = MailItem, 46 = ReportItem (NDR - Non-Delivery Report)
      if ($item.Class -ne 43 -and $item.Class -ne 46) { 
        continue 
      }
      
      $processed++
      if ($processed -gt $maxToProcess) { break }
      
      $itemType = if ($item.Class -eq 43) { "MailItem" } else { "ReportItem" }
      
      Write-Host "✓ Procesando [$itemType]: $($item.Subject)"
      
      $senderEmail = ""
      $senderName = ""
      
      # ReportItems no tienen remitente normal, son del sistema
      if ($item.Class -eq 46) {
        $senderEmail = "system-ndr@outlook.com"
        $senderName = "Mail Delivery System"
        Write-Host "  ⚠️⚠️⚠️ ReportItem detectado (NDR): $($item.Subject)"
      } else {
        # Procesar MailItem normal
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
      }
      
      $bodyPreview = ""
      try {
        if ($item.Body) {
          # Para ReportItems, necesitamos más texto para extraer el email
          $bodyLength = if ($item.Class -eq 46) { 
            [Math]::Min(2000, $item.Body.Length) 
          } else { 
            [Math]::Min(500, $item.Body.Length) 
          }
          $bodyPreview = $item.Body.Substring(0, $bodyLength)
        }
      } catch {
        $bodyPreview = ""
      }
      
      $results += [PSCustomObject]@{
        Subject = $item.Subject
        SenderName = $senderName
        SenderEmail = $senderEmail
        SenderEmailType = if ($item.Class -eq 46) { "ReportItem" } else { $item.SenderEmailType }
        ReceivedTime = $item.ReceivedTime.ToString("yyyy-MM-dd HH:mm:ss")
        Body = $bodyPreview
        ConversationTopic = $item.ConversationTopic
        ItemType = $itemType
        ItemClass = $item.Class
      }
      
    } catch {
      Write-Host "Error procesando item: $($_.Exception.Message)"
    }
  }

  Write-Host ""
  Write-Host "=========================================="
  Write-Host "ESTADÍSTICAS DE CLASES DE ITEMS:"
  foreach ($key in $classStats.Keys | Sort-Object) {
    $className = switch ($key) {
      43 { "MailItem" }
      46 { "ReportItem (NDR)" }
      default { "Unknown ($key)" }
    }
    Write-Host "  Class $key ($className): $($classStats[$key]) items"
  }
  Write-Host "=========================================="
  Write-Host ""
  Write-Host "Total procesados y guardados: $($results.Count)"
  
  # Contar MailItems y ReportItems
  $mailItems = ($results | Where-Object { $_.ItemClass -eq 43 }).Count
  $reportItems = ($results | Where-Object { $_.ItemClass -eq 46 }).Count
  Write-Host "  - MailItems: $mailItems"
  Write-Host "  - ReportItems (NDR): $reportItems"









  # CRÍTICO: Usar WriteAllText con UTF8 sin BOM
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  if ($results.Count -eq 0) {
    [System.IO.File]::WriteAllText('C:\\Users\\candresd\\Downloads\\nurture-rocket-crm-main\\backend\\temp\\inbox_92d56e58-29c1-48b2-993c-d113ba4fa607.json', '[]', $utf8NoBom)
  } else {
    $json = $results | ConvertTo-Json -Depth 3 -Compress
    [System.IO.File]::WriteAllText('C:\\Users\\candresd\\Downloads\\nurture-rocket-crm-main\\backend\\temp\\inbox_92d56e58-29c1-48b2-993c-d113ba4fa607.json', $json, $utf8NoBom)
  }

  Write-Host "Success"
  
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText('C:\\Users\\candresd\\Downloads\\nurture-rocket-crm-main\\backend\\temp\\inbox_92d56e58-29c1-48b2-993c-d113ba4fa607.json', '[]', $utf8NoBom)
  exit 1
}