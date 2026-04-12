$items = Get-ChildItem -Force
$results = foreach ($item in $items) {
    if ($item.PSIsContainer) {
        $size = (Get-ChildItem $item.FullName -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    } else {
        $size = $item.Length
    }
    [PSCustomObject]@{
        Name = $item.Name
        SizeMB = [math]::Round($size / 1MB, 2)
    }
}
$results | Sort-Object SizeMB -Descending | Select-Object -First 20 | Format-Table -AutoSize
