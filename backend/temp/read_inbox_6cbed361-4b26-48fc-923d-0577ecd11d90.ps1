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
  
  foreach ($item in $filteredItems) {
    try {
      if ($item.Class -ne 43) { continue }
      
      $processed++
      if ($processed -gt $maxToProcess) { break }
      
      if ($processed -le 5) {
        Write-Host "Procesando: $($item.Subject)"
      }
      
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
      }
      
    } catch {
      Write-Host "Error procesando item: $($_.Exception.Message)"
    }
  }

  Write-Host "Total procesados: $($results.Count)"

  # CRÍTICO: Usar WriteAllText con UTF8 sin BOM
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  if ($results.Count -eq 0) {
    [System.IO.File]::WriteAllText('C:\\Users\\candresd\\Downloads\\nurture-rocket-crm-main\\backend\\temp\\inbox_fdd0c46a-fb91-41ce-a96c-f90c5c9c2967.json', '[]', $utf8NoBom)
  } else {
    $json = $results | ConvertTo-Json -Depth 3 -Compress
    [System.IO.File]::WriteAllText('C:\\Users\\candresd\\Downloads\\nurture-rocket-crm-main\\backend\\temp\\inbox_fdd0c46a-fb91-41ce-a96c-f90c5c9c2967.json', $json, $utf8NoBom)
  }

  Write-Host "Success"
  
} catch {
  Write-Host "ERROR: $($_.Exception.Message)"
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText('C:\\Users\\candresd\\Downloads\\nurture-rocket-crm-main\\backend\\temp\\inbox_fdd0c46a-fb91-41ce-a96c-f90c5c9c2967.json', '[]', $utf8NoBom)
  exit 1
}