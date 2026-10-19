# Concurrency & Load Stress Test Script
# Measures connection pool stability, throughput, and latencies under 30-50 concurrent requests
param(
    [string]$BaseUrl = "http://localhost:5000",
    [int]$Concurrency = 30
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Net.Http

# Compile native high-performance async LoadTester
$csharpSource = @"
using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Collections.Concurrent;
using System.Diagnostics;

public class NativeLoadTester {
    public static string RunLoad(string method, string url, string body, string authHeader, int count) {
        ServicePointManager.DefaultConnectionLimit = 150;
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        
        var client = new HttpClient();
        client.Timeout = TimeSpan.FromSeconds(30);
        var bag = new ConcurrentBag<long>();
        int successes = 0;
        int failures = 0;
        var tasks = new Task[count];
        var totalSw = Stopwatch.StartNew();

        for (int i = 0; i < count; i++) {
            tasks[i] = Task.Run(async () => {
                var sw = Stopwatch.StartNew();
                try {
                    var req = new HttpRequestMessage(new HttpMethod(method), url);
                    if (!string.IsNullOrEmpty(authHeader)) {
                        req.Headers.TryAddWithoutValidation("Authorization", authHeader);
                    }
                    if (!string.IsNullOrEmpty(body) && (method == "POST" || method == "PUT")) {
                        req.Content = new StringContent(body, Encoding.UTF8, "application/json");
                    }
                    var resp = await client.SendAsync(req);
                    sw.Stop();
                    bag.Add(sw.ElapsedMilliseconds);
                    if (resp.IsSuccessStatusCode) {
                        System.Threading.Interlocked.Increment(ref successes);
                    } else {
                        System.Threading.Interlocked.Increment(ref failures);
                    }
                } catch {
                    sw.Stop();
                    bag.Add(sw.ElapsedMilliseconds);
                    System.Threading.Interlocked.Increment(ref failures);
                }
            });
        }
        Task.WaitAll(tasks);
        totalSw.Stop();
        client.Dispose();

        long min = long.MaxValue, max = 0, sum = 0;
        foreach (var d in bag) {
            if (d < min) min = d;
            if (d > max) max = d;
            sum += d;
        }
        double avg = bag.Count > 0 ? (double)sum / bag.Count : 0;
        double rps = totalSw.ElapsedMilliseconds > 0 ? (count / (totalSw.ElapsedMilliseconds / 1000.0)) : 0;

        return string.Format("{{\"success\":{0},\"failed\":{1},\"min\":{2},\"max\":{3},\"avg\":{4},\"totalMs\":{5},\"rps\":{6}}}",
            successes, failures, (min == long.MaxValue ? 0 : min), max, Math.Round(avg, 1), totalSw.ElapsedMilliseconds, Math.Round(rps, 1));
    }
}
"@

Add-Type -TypeDefinition $csharpSource -ReferencedAssemblies "System.Net.Http"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   AI-Exam-Proctoring-System Concurrency & Load Test" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Target Base URL: $BaseUrl"
Write-Host "Concurrency Level: $Concurrency concurrent requests per test"
Write-Host ""

# Step 0: Ensure test user exists for authenticated load tests
$loginPayload = @{
    email = "concurrency_test_teacher@example.com"
    password = "password123"
} | ConvertTo-Json

$regPayload = @{
    name = "Concurrency Load Tester"
    email = "concurrency_test_teacher@example.com"
    password = "password123"
    role = "teacher"
    clientCode = "DEFAULT"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/users" -Method Post -Body $regPayload -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
} catch {}

$authRes = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
$token = $authRes.token
if (-not $token) {
    Write-Error "Failed to obtain auth token for concurrency testing."
}
Write-Host "[INIT] Auth token acquired successfully." -ForegroundColor Green

function Run-Suite {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Body,
        [string]$AuthHeader,
        [int]$Count
    )

    Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
    Write-Host "RUNNING: $Name ($Count concurrent $Method requests)" -ForegroundColor Yellow
    Write-Host "Target: $Url" -ForegroundColor Yellow
    Write-Host "----------------------------------------------------------" -ForegroundColor Yellow

    $rawJson = [NativeLoadTester]::RunLoad($Method, $Url, $Body, $AuthHeader, $Count)
    $stats = $rawJson | ConvertFrom-Json

    Write-Host "Results for $Name :" -ForegroundColor Cyan
    Write-Host "  Total Requests:  $Count"
    Write-Host "  Success:         $($stats.success) / $Count" -ForegroundColor $(if ($stats.failed -eq 0) { "Green" } else { "Red" })
    Write-Host "  Failures:        $($stats.failed)" -ForegroundColor $(if ($stats.failed -eq 0) { "Green" } else { "Red" })
    Write-Host "  Total Time:      $($stats.totalMs) ms"
    Write-Host "  Throughput:      $($stats.rps) req/sec"
    Write-Host "  Latency Min:     $($stats.min) ms"
    Write-Host "  Latency Avg:     $($stats.avg) ms"
    Write-Host "  Latency Max:     $($stats.max) ms"

    return @{
        Name = $Name
        Success = $stats.success
        Failed = $stats.failed
        AvgMs = $stats.avg
        Rps = $stats.rps
    }
}

# Register & Login Student
$studentEmail = "concurrency_test_student@example.com"
$studentReg = @{
    name = "Concurrency Student"
    email = $studentEmail
    password = "password123"
    role = "student"
    clientCode = "DEFAULT"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$BaseUrl/api/users" -Method Post -Body $studentReg -ContentType "application/json" -ErrorAction SilentlyContinue | Out-Null
} catch {}

$studentAuth = Invoke-RestMethod -Uri "$BaseUrl/api/auth/login" -Method Post -Body (@{ email = $studentEmail; password = "password123" } | ConvertTo-Json) -ContentType "application/json"
$studentToken = $studentAuth.token
$studentId = if ($studentAuth.user.id) { $studentAuth.user.id } else { $studentAuth.user._id }

# Teacher creates a dedicated Load Test Exam
$loadExamId = "LOAD_EXAM_01"
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/users/exam" -Method Post -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body (@{
        examName = "Concurrency Stress Exam"
        examId = $loadExamId
        examPassword = "loadPassword123"
        totalMarks = 100
        passingMarks = 40
        totalQuestions = 1
        duration = 60
        liveDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
        deadDate = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
    } | ConvertTo-Json) | Out-Null
} catch {}

# Student requests enrollment & Teacher approves
try {
    Invoke-RestMethod -Uri "$BaseUrl/api/users/exam/$loadExamId/request-enrollment" -Method Post -Headers @{ Authorization = "Bearer $studentToken" } -ContentType "application/json" -Body "{}" | Out-Null
    Invoke-RestMethod -Uri "$BaseUrl/api/users/exam/$loadExamId/approve-enrollment/$studentId" -Method Post -Headers @{ Authorization = "Bearer $token" } | Out-Null
} catch {}

# Student starts session
$sessionRes = Invoke-RestMethod -Uri "$BaseUrl/api/sessions/start" -Method Post -Headers @{ Authorization = "Bearer $studentToken" } -ContentType "application/json" -Body (@{
    examId = $loadExamId
    examPassword = "loadPassword123"
} | ConvertTo-Json)
$activeSessionId = [int64]$sessionRes.sessionId
Write-Host "[INIT] Active student proctoring session initialized: SessionId=$activeSessionId" -ForegroundColor Green

# TEST 1: Concurrent Logins (Auth & BCrypt computation)
$res1 = Run-Suite -Name "1. Concurrent Logins" -Method "POST" -Url "$BaseUrl/api/auth/login" -Body $loginPayload -AuthHeader "" -Count $Concurrency

# TEST 2: Concurrent Exam Queries (Database Connection Read Pooling)
$res2 = Run-Suite -Name "2. Concurrent Exam Queries" -Method "GET" -Url "$BaseUrl/api/users/exam" -Body "" -AuthHeader "Bearer $token" -Count $Concurrency

# TEST 3: Concurrent Proctoring Telemetry (Database Connection Write Pooling)
$eventPayload = @{
    sessionId = $activeSessionId
    examId = $loadExamId
    eventType = "HEAD_MOVEMENT"
    confidence = 0.95
    evidenceUrl = ""
    details = "Automated concurrency test event"
} | ConvertTo-Json

$res3 = Run-Suite -Name "3. Concurrent Proctoring Telemetry" -Method "POST" -Url "$BaseUrl/api/proctoring/events" -Body $eventPayload -AuthHeader "Bearer $studentToken" -Count $Concurrency

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "               CONCURRENCY AUDIT SUMMARY" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ("{0,-35} | {1,-10} | {2,-10} | {3,-10}" -f "Test Suite", "Success", "Avg Latency", "Throughput")
Write-Host "----------------------------------------------------------------------"
Write-Host ("{0,-35} | {1,-10} | {2,-10} | {3,-10}" -f $res1.Name, "$($res1.Success)/$Concurrency", "$($res1.AvgMs)ms", "$($res1.Rps) rps")
Write-Host ("{0,-35} | {1,-10} | {2,-10} | {3,-10}" -f $res2.Name, "$($res2.Success)/$Concurrency", "$($res2.AvgMs)ms", "$($res2.Rps) rps")
Write-Host ("{0,-35} | {1,-10} | {2,-10} | {3,-10}" -f $res3.Name, "$($res3.Success)/$Concurrency", "$($res3.AvgMs)ms", "$($res3.Rps) rps")
Write-Host "==========================================================" -ForegroundColor Green

if ($res1.Failed -eq 0 -and $res2.Failed -eq 0 -and $res3.Failed -eq 0) {
    Write-Host "ALL CONCURRENCY TESTS PASSED WITH 100% SUCCESS RATE." -ForegroundColor Green
    exit 0
} else {
    Write-Host "CONCURRENCY TEST DETECTED FAILURES." -ForegroundColor Red
    exit 1
}
