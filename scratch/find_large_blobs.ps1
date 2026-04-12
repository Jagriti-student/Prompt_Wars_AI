$objects = git rev-list --objects --all | git cat-file --batch-check='%(objectname) %(objecttype) %(objectsize) %(rest)'
$results = foreach ($line in $objects) {
    if ($line -match '^([0-9a-f]{40})\s+blob\s+(\d+)\s*(.*)$') {
        [PSCustomObject]@{
            Hash = $matches[1]
            SizeKB = [math]::Round([int]$matches[2] / 1KB, 2)
            Path = $matches[3]
        }
    }
}
$results | Sort-Object SizeKB -Descending | Select-Object -First 30 | Format-Table -AutoSize
