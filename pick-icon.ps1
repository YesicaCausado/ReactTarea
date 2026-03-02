Add-Type -AssemblyName System.Windows.Forms
$ofd = New-Object System.Windows.Forms.OpenFileDialog
$ofd.Title = "Selecciona tu icono para DivideYa"
$ofd.Filter = "PNG (*.png)|*.png|All files (*.*)|*.*"
if ($ofd.ShowDialog() -eq "OK") {
    Copy-Item $ofd.FileName -Destination "c:\Users\Yesica\react\divideya\assets\icon-source.png" -Force
    Write-Host "ICONO GUARDADO desde: $($ofd.FileName)"
} else {
    Write-Host "CANCELADO"
}
