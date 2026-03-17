# Auth Flow Test Script

$logFile = "d:\nqrpro\auth_test_results.txt"
Remove-Item $logFile -ErrorAction SilentlyContinue

# Test 1: HM Signup
Add-Content $logFile "=== TEST 1: HM Registration (Strong Password, 10-digit Phone) ==="
$hmSignup = @{
    email = "hm@exhsp.com"
    password = "Noqpk@12345"
    full_name = "EXHSP Hospital Manager"
    role = "hm"
    hospital_id = "EXHSP-294392"
    phone = "9876543210"
} | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/auth/signup" `
        -Method Post -ContentType "application/json" -Body $hmSignup
    Add-Content $logFile "✓ SUCCESS"
    Add-Content $logFile "  Email: $($resp.data.email)"
    Add-Content $logFile "  Role: $($resp.data.role)"
    Add-Content $logFile "  Hospital: $($resp.data.hospital_id)"
} catch {
    Add-Content $logFile "✗ FAILED"
    Add-Content $logFile "  Error: $($_.ErrorDetails.Message)"
}

# Test 2: Weak Password Validation
Add-Content $logFile ""
Add-Content $logFile "=== TEST 2: Weak Password Rejection ==="
$weakPwd = @{
    email = "weak@test.com"
    password = "weak123"
    full_name = "Test User"
    role = "patient"
    phone = "9876543210"
} | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/auth/signup" `
        -Method Post -ContentType "application/json" -Body $weakPwd
    Add-Content $logFile "✗ FAILED - Should have rejected weak password"
} catch {
    Add-Content $logFile "✓ SUCCESS - Rejected weak password"
    Add-Content $logFile "  Error: $($_.ErrorDetails.Message)"
}

# Test 3: Invalid Phone Validation
Add-Content $logFile ""
Add-Content $logFile "=== TEST 3: Invalid Phone Rejection ==="
$badPhone = @{
    email = "badphone@test.com"
    password = "Noqpk@12345"
    full_name = "Test User"
    role = "patient"
    phone = "98765"
} | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/auth/signup" `
        -Method Post -ContentType "application/json" -Body $badPhone
    Add-Content $logFile "✗ FAILED - Should have rejected invalid phone"
} catch {
    Add-Content $logFile "✓ SUCCESS - Rejected invalid phone"
    Add-Content $logFile "  Error: $($_.ErrorDetails.Message)"
}

# Test 4: Doctor Signup
Add-Content $logFile ""
Add-Content $logFile "=== TEST 4: Doctor Registration (Must match hospital) ==="
$doctorSignup = @{
    email = "dr.smith@exhsp.com"
    password = "DocPass@2024#"
    full_name = "Dr. Smith"
    role = "doctor"
    hospital_id = "EXHSP-294392"
    phone = "9123456789"
} | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/auth/signup" `
        -Method Post -ContentType "application/json" -Body $doctorSignup
    Add-Content $logFile "✓ SUCCESS"
    Add-Content $logFile "  Email: $($resp.data.email)"
    Add-Content $logFile "  Role: $($resp.data.role)"
    Add-Content $logFile "  Hospital: $($resp.data.hospital_id)"
} catch {
    Add-Content $logFile "✗ FAILED"
    Add-Content $logFile "  Error: $($_.ErrorDetails.Message)"
}

# Test 5: Patient Signup
Add-Content $logFile ""
Add-Content $logFile "=== TEST 5: Patient Registration ==="
$patientSignup = @{
    email = "patient@test.com"
    password = "Patient@2024!"
    full_name = "John Patient"
    role = "patient"
    phone = "9999988888"
} | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/auth/signup" `
        -Method Post -ContentType "application/json" -Body $patientSignup
    Add-Content $logFile "✓ SUCCESS"
    Add-Content $logFile "  Email: $($resp.data.email)"
    Add-Content $logFile "  Role: $($resp.data.role)"
} catch {
    Add-Content $logFile "✗ FAILED"
    Add-Content $logFile "  Error: $($_.ErrorDetails.Message)"
}

# Test 6: HM Login
Add-Content $logFile ""
Add-Content $logFile "=== TEST 6: HM Login Flow ==="
$hmLogin = @{
    email = "hm@exhsp.com"
    password = "Noqpk@12345"
    role = "hm"
} | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/auth/login" `
        -Method Post -ContentType "application/json" -Body $hmLogin
    Add-Content $logFile "✓ SUCCESS"
    Add-Content $logFile "  Email: $($resp.data.email)"
    Add-Content $logFile "  Role: $($resp.data.role)"
} catch {
    Add-Content $logFile "✗ FAILED"
    Add-Content $logFile "  Error: $($_.ErrorDetails.Message)"
}

# Test 7: Doctor Login (with hospital validation)
Add-Content $logFile ""
Add-Content $logFile "=== TEST 7: Doctor Login (Hospital ID Matching) ==="
$docLogin = @{
    email = "dr.smith@exhsp.com"
    password = "DocPass@2024#"
    role = "doctor"
} | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/auth/login" `
        -Method Post -ContentType "application/json" -Body $docLogin
    Add-Content $logFile "✓ SUCCESS"
    Add-Content $logFile "  Email: $($resp.data.email)"
    Add-Content $logFile "  Role: $($resp.data.role)"
} catch {
    Add-Content $logFile "✗ FAILED"
    Add-Content $logFile "  Error: $($_.ErrorDetails.Message)"
}

# Test 8: Patient Login
Add-Content $logFile ""
Add-Content $logFile "=== TEST 8: Patient Login ==="
$patLogin = @{
    email = "patient@test.com"
    password = "Patient@2024!"
    role = "patient"
} | ConvertTo-Json -Compress

try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8001/auth/login" `
        -Method Post -ContentType "application/json" -Body $patLogin
    Add-Content $logFile "✓ SUCCESS"
    Add-Content $logFile "  Email: $($resp.data.email)"
    Add-Content $logFile "  Role: $($resp.data.role)"
} catch {
    Add-Content $logFile "✗ FAILED"
    Add-Content $logFile "  Error: $($_.ErrorDetails.Message)"
}

Write-Output "Test results written to $logFile"
Get-Content $logFile
