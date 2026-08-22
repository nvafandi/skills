# Cucumber + Allure + Mockoon â€” Setup Guide

Guide ini menjelaskan cara **membuat & menjalankan Cucumber Test** pada project Quarkus,
**mengintegrasikannya dengan Allure** untuk laporan hasil test, dan **menggunakan Mockoon CLI**
untuk mem-mock endpoint HTTP eksternal.

Dokumen ini bersifat ganda:

1. **Setup dari nol** (migrate ke project lain / project baru).
2. **Menambahkan endpoint baru** ke suite test yang sudah ada.

> Referensi implementasi nyata ada pada project ini:
> `src/test/java/com/prudential/pruforce/aob/*`, `src/test/resources/features/`,
> `src/test/resources/mockoon/`, dan `deployment/config/application-test.properties`.

---

## 1. Arsitektur / Cara Kerja

```
                        +------------------------------+
                        |   Maven / Surefire             |  mvn test
                        +--------------+----------------+
                                       |
                                       v
              +------------------------------+   extends   +--------------------------+
              | CucumberTest (CucumberQuarkusTest)      <- | io.quarkiverse.cucumber   |
              +------------------------------+           +--------------------------+
                | @BeforeAll            | @AfterAll
                | MockoonServer.start() | MockoonServer.shutdown()
                v                       v
       +---------------------+     proses `node <mockoon cli> start ...`
       |  Mockoon CLI mock    |     (berjalan sebagai separate process)
       |  http://127.0.0.1:3000 |
       +---------------------+
                ^
                | dipanggil oleh aplikasi Quarkus (test) via
                | `deployment/config/application-test.properties`
                v
          +----------------------+
          |  Aplikasi Quarkus     |  (rest-assured mengirim request)
          |  berjalan in-process   |
          +----------------------+
```

- **Runner**: `CucumberTest` extends `CucumberQuarkusTest` (dari `quarkus-cucumber`),
  sehingga aplikasi Quarkus dijalankan di dalam test (in-test container).
- **Step definitions**: di package `com.prudential.pruforce.aob.steps`
  (`CommonStepDefinitions` + `TestContext` yang di-scope per scenario).
- **Feature files**: `src/test/resources/features/<modul>/*.feature`.
- **External HTTP mocks**: proses mock dari **Mockoon CLI**, dialihkan lewat config
  `aob-transaction.url.*` di `application-test.properties` ke `http://127.0.0.1:3000`.
- **Allure**: adapter `allure-cucumber7-jvm` menghasilkan hasil mentah di `target/allure-results/`,
  lalu plugin `allure-maven` membuat laporan HTML.

---

## 2. Prerequisites

| Komponen | Versi yang dipakai | Keterangan |
|----------|-------------------|------------|
| OpenJDK / JDK | 21 | `maven.compiler.release=21` |
| Maven | 3.9.x | Build & test runner |
| Node.js | 18+ (LTS) | Untuk menjalankan Mockoon CLI (opsional jika pakai Docker) |
| npm | â€" | Package manager Node (opsional jika pakai Docker) |
| @mockoon/cli | global (latest) | CLI mock server (opsional jika pakai Docker) |
| Docker | latest | Opsi alternatif tanpa Node.js |
| Docker Compose | latest | Opsi untuk multi-service setup |

Cek versi:

```bash
java -version
mvn -version
node --version
npm --version
```

Install **Mockoon CLI** global (sekali saja per mesin):

```bash
npm install -g @mockoon/cli
```

Cek lokasi CLI (dipakai `MockoonServer.java`):

```bash
npm root -g
# Windows biasanya menghasilkan:
# C:\Users\<USER>\AppData\Roaming\npm\node_modules
```

Lihat opsi CLI:

```bash
mockoon-cli --help
```

---

## 3. Dependensi (pom.xml)

Semua dependensi test berada di bagian `<dependencies>` dengan `<scope>test</scope>`,
dan managed oleh **Allure BOM** (`allure-bom`) + **Quarkus BOM** (`quarkus-bom`).

### 3.1 Opsi Allure 3 (default, recommended)

Allure 3 menggunakan **Maven plugin** (`allure-maven`) yang mengelola semua secara internal.
Tidak perlu install Node.js atau npx - plugin akan memprovision Node.js runtime otomatis.

```xml
<properties>
    <allure.version>3.4.1</allure.version>
</properties>

<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>io.qameta.allure</groupId>
            <artifactId>allure-bom</artifactId>
            <version>${allure.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- REST client untuk mengirim request HTTP ke endpoint yang di-test -->
    <dependency>
        <groupId>io.rest-assured</groupId>
        <artifactId>rest-assured</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Cucumber runner untuk Quarkus: CucumberTest extends CucumberQuarkusTest -->
    <dependency>
        <groupId>io.quarkiverse.cucumber</groupId>
        <artifactId>quarkus-cucumber</artifactId>
        <version>1.3.0</version>
        <scope>test</scope>
    </dependency>

    <!-- Allure adapter untuk Cucumber 7 -> menulis hasil ke target/allure-results -->
    <dependency>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-cucumber7-jvm</artifactId>
        <scope>test</scope>
    </dependency>

    <!-- Integrasi Allure dengan JUnit Platform runner -->
    <dependency>
        <groupId>io.qameta.allure</groupId>
        <artifactId>allure-junit-platform</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

Plugin untuk generate laporan (di dalam `<build><plugins>`):

```xml
<plugin>
    <groupId>io.qameta.allure</groupId>
    <artifactId>allure-maven</artifactId>
    <version>2.12.0</version>
    <!-- Tidak perlu reportVersion untuk Allure 3 (default) -->
</plugin>
```

**Cara kerja Allure 3 dengan Maven:**
1. Plugin `allure-maven` akan memprovision Node.js runtime internal secara otomatis
2. Runtime disimpan di `${project.basedir}/.allure/` (di-gitignore)
3. Semua command menggunakan Maven: `mvn allure:report`, `mvn allure:serve`
4. Tidak perlu install apapun selain Maven

### 3.2 Opsi Allure 2 (legacy)

Jika project masih menggunakan Allure 2, set `reportVersion` ke `2.x`:

```xml
<properties>
    <allure.version>2.29.1</allure.version>
</properties>

<!-- ... dependencyManagement & dependencies sama seperti di atas ... -->

<plugin>
    <groupId>io.qameta.allure</groupId>
    <artifactId>allure-maven</artifactId>
    <version>2.12.0</version>
    <configuration>
        <reportVersion>2.39.0</reportVersion>
    </configuration>
</plugin>
```

> **Catatan**: 
> - **Allure 2**: Membutuhkan binary Allure CLI secara lokal atau di-download otomatis oleh plugin.
> - **Allure 3**: Menggunakan Maven plugin (`allure-maven`) yang memprovision Node.js runtime internal.
>   Tidak perlu install Node.js, npm, atau npx - semuanya di-handle oleh Maven.

### 3.3 Perbandingan Allure 2 vs 3

| Aspek | Allure 2 | Allure 3 |
|-------|----------|----------|
| **Versi plugin** | `2.12.0` + `reportVersion=2.x` | `2.12.0` (default) |
| **BOM version** | `2.29.1` | `3.4.1` |
| **Runtime** | Allure CLI (Java) | Node.js internal (via Maven plugin) |
| **Install Node.js** | Tidak perlu | Tidak perlu (di-provision Maven plugin) |
| **Install npx** | Tidak perlu | Tidak perlu |
| **Report output** | `target/allure-report/index.html` | `target/site/allure-maven/index.html` |
| **Config files** | `allure.properties` | `allurerc.js/json/yaml` |
| **JDK minimum** | JDK 8+ | JDK 17+ |
| **Setup** | Maven plugin | Maven plugin (otomatis) |

| Baris | Arti |
|------|------|
| `io.rest-assured:rest-assured` | HTTP client untuk step definitions |
| `io.quarkiverse.cucumber:quarkus-cucumber` | Integrasi Quarkus + Cucumber (runner) |
| `allure-cucumber7-jvm` | Menulis hasil test ke `target/allure-results` |
| `allure-junit-platform` | Allure listener untuk JUnit Platform |
| `allure-maven` | Eksekusi `mvn allure:report` / `allure:serve` |

---
---

## 4. Struktur Project Test

```
src/test/
  java/com/prudential/pruforce/aob/
    CucumberTest.java          # Runner (extends CucumberQuarkusTest)
    MockoonServer.java         # Start/stop Mockoon CLI di sekitar test
    steps/
      CommonStepDefinitions.java   # Step definitions generik
      TestContext.java             # State per-scenario (@ScenarioScope)
  resources/
    cucumber.properties       # Config Cucumber (features, glue, plugin)
    allure.properties         # Config Allure v2 (folder hasil)
    application.properties    # Config Quarkus utk test (port, datasource, config.locations)
    features/<modul>/*.feature
    mockoon/aob-external-mockoon.json   # Definisi route mock

# Root project (opsional, untuk Allure 3)
allurerc.json               # Config Allure 3 (opsional, auto-detect)

deployment/config/application-test.properties  # Override URL eksternal -> Mockoon
```

> `cucumber.features` menunjuk ke folder (bukan satu file) sehingga semua `.feature`
> di dalamnya otomatis ke-scan oleh CucumberQuarkusTest.

> **Allure 3**: Config file `allurerc.*` diletakkan di root project dan di-auto-detect oleh plugin.
> **Allure 2**: Gunakan `allure.properties` di `src/test/resources/`.

---

## 5. File-File Kunci

### 5.1 CucumberTest.java (Runner)

`CucumberTest` extends `CucumberQuarkusTest`, yang:
- Menjalankan aplikasi Quarkus secara in-process selama suite berjalan.
- Me-discover semua file `.feature` sesuai `cucumber.properties`.
- Me-load step definitions dari package `glue`.

Mockoon hidup/mati di-*bundle* lewat `@BeforeAll` / `@AfterAll` (JUnit 5):

```java
package com.prudential.pruforce.aob;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import io.quarkiverse.cucumber.CucumberQuarkusTest;

public class CucumberTest extends CucumberQuarkusTest {

    @BeforeAll
    static void startMockoon() { MockoonServer.start(); }

    @AfterAll
    static void stopMockoon() { MockoonServer.shutdown(); }

    public static void main(String[] args) {
        runMain(CucumberTest.class, args);
    }
}
```

Jalankan via Maven:

```bash
mvn test -Dtest=CucumberTest
```

### 5.2 cucumber.properties (config Cucumber)

Dibaca oleh engine Cucumber; menjadi **single source of truth** untuk `features`,
`glue`, dan `plugin`.

```properties
cucumber.publish.enabled=false

# Lokasi feature file (folder) - bisa folder per modul
cucumber.features=src/test/resources/features/transaction/

# Package step definitions (comma-separated jika lebih dari satu)
cucumber.glue=com.prudential.pruforce.aob.steps

# Filter tag, misal @smoke / "not @skip"; kosongkan utk jalankan semua
cucumber.tags=

# plugin pelaporan (pretty + Allure + JSON + JUnit XML)
cucumber.plugin=pretty,io.qameta.allure.cucumber7jvm.AllureCucumber7Jvm,json:target/cucumber-reports/cucumber.json,junit:target/cucumber-reports/junit-report.xml

cucumber.strict=true
cucumber.monochrome=false
```

**Plugin penting**:
- `io.qameta.allure.cucumber7jvm.AllureCucumber7Jvm` -> menulis hasil mentah Allure per scenario/step.
- `json:...` / `junit:...` -> laporan tambahan utk CI (opsional).

> Filter tag: `mvn test -Dtest=CucumberTest -Dcucumber.filter.tags="@smoke"`

### 5.3 Konfigurasi Allure

**Allure 2** - Gunakan file `allure.properties`:

```properties
allure.results.directory=target/allure-results
```

**Allure 3** - Gunakan file `allurerc.json` atau `allurerc.yaml`:

```json
{
  "resultsDirectory": "target/allure-results",
  "reportName": "AOB Test Report"
}
```

Atau `allurerc.yaml`:

```yaml
resultsDirectory: "target/allure-results"
reportName: "AOB Test Report"
```

Folder hasil dikonsumsi oleh `mvn allure:report` dan `mvn allure:serve` (plugin `allure-maven`).

### 5.4 Step Definitions (CommonStepDefinitions + TestContext)

`CommonStepDefinitions` berisi step generik yang dipakai ulang semua feature. Statenya disimpan
pada `TestContext` yang di-scope per scenario (`@ScenarioScope`) sehingga tidak bocor antar scenario.

Vocabulary step yang tersedia:

| Step | Contoh |
|------|--------|
| `the request content type is "..."` | `Given the request content type is "application/json"` |
| `the expected response content type is "..."` | `And the expected response content type is "application/json"` |
| `a GET request is sent to "..."` | `When a GET request is sent to "/aob-transaction/document"` |
| `a POST request is sent to "..."` | `When a POST request is sent to "/api/books"` |
| `a POST request with multipart/form-data is sent to "..."` | `When a POST request with multipart/form-data is sent to "/api/upload"` |
| `the request body is:` (docstring JSON) | `And the request body is: """ {..} """` |
| `the query parameters are:` (DataTable) | `And the query parameters are: | page | 1 |` |
| `the multipart form field "..." is a file upload` | `And the multipart form field "file" is a file upload` |
| `the multipart form field "..." are file uploads` | plural |
| `the multipart form field "..." is "..."` | `And the multipart form field "name" is "value"` |
| `the response status code is {int}` | `Then the response status code is 200` |
| `the response content type is "..."` | `Then the response content type is "application/json"` |
| `the response JSON at "..." is {string}` | `Then the response JSON at "$.message" is "Success"` |
| `... is {int}` | `And the response JSON at "$.status" is 200` |
| `... is true / false / null / not null` | `And the response JSON at "$.data" is not null` |
| `... is a list / an empty list / a number / a boolean / a string` | tipe data |
| `... is one of: ...` | `And the response JSON at "$.code" is one of: "200", "501"` |

> Step `a GET/POST request ...` otomatis memanggil `context.resetRequest()`, jadi tiap
> scenario cukup satu block `Given -> When -> Then`.

### 5.5 TestContext.java (state per scenario)

Menyimpan `path`, HTTP method, multipart flag, content-type, request body, query params,
multipart fields, dan `Response` terakhir. Method `applyTo(...)` menerapkan content-type/
query-params ke request rest-assured.

```java
@ScenarioScope
public class TestContext {
    private String path;
    private String httpMethod;
    private boolean multipart;
    private String contentType = "application/json";
    private String requestBody;
    private final Map<String, String> queryParams = new LinkedHashMap<>();
    private final Map<String, MultipartField> multipartFields = new LinkedHashMap<>();
    private Response response;
    private boolean executed;
    // + getters/setters + resetRequest() + applyTo(RequestSpecification)
}
```

---
## 6. Mockoon CLI (Mock Server Eksternal)

### 6.1 Apa itu Mockoon CLI

Mockoon adalah mock HTTP API. `@mockoon/cli` adalah versi command-line yang bisa
menjalankan file *environment* (JSON) sebagai server HTTP lokal tanpa GUI.

Install global (sekali per mesin):

```bash
npm install -g @mockoon/cli
```

### 6.2 Bagaimana project ini memanggilnya (MockoonServer.java)

`MockoonServer` me-spawn proses `node` terpisah lewat `ProcessBuilder`, menunggu port-nya
siap (polling TCP), lalu meng-*destroy* proses saat suite selesai. Argumen CLI:

```
node <cli>/run.js start --data <environment.json> --port 3000 --disable-tls --max-transaction-logs 0
```

Lokasi CLI di-scan dari system properties (memudahkan override tanpa ubah kode):

| Property | Default | Ket |
|----------|---------|-----|
| `mockoon.port` | `3000` | Port mock |
| `mockoon.dataFilePath` | classpath `mockoon/aob-external-mockoon.json` | File environment |
| `mockoon.mode` | `cli` | Mode operasi: `cli`, `docker`, atau `docker-compose` |
| `mockoon.node` | `node` | Executable Node (hanya untuk mode `cli`) |
| `mockoon.cli` | `C:\Users\477179\AppData\Roaming\npm\node_modules\@mockoon\cli\bin\run.js` | Entrypoint CLI (hanya untuk mode `cli`) |
| `mockoon.docker.image` | `mockoon/cli:latest` | Image Docker (hanya untuk mode `docker`) |
| `mockoon.docker.containerName` | `mockoon-mock` | Nama container (hanya untuk mode `docker`) |

Jika file environment tidak ditemukan manual, JSON disalin dari resource classpath
`mockoon/aob-external-mockoon.json` ke file temp dengan `deleteOnExit`.

### 6.3 Struktur file environment Mockoon (JSON)

File environment berisi array `routes`. Contoh satu route:

```json
{
  "type": "http",
  "method": "post",
  "endpoint": "/aob-baw-services/startbpm",
  "enabled": true,
  "responses": [
    {
      "statusCode": 200,
      "label": "success",
      "body": "{\"resultCode\":\"00\"}",
      "bodyType": "INLINE",
      "latency": 0,
      "headers": [],
      "rules": [],
      "rulesOperator": "OR",
      "disableTemplating": true
    }
  ]
}
```

Field kunci:
- `method`: `get`, `post`, `put`, `delete`, dll.
- `endpoint`: path URL (tanpa host/port).
- `responses[].statusCode` & `responses[].body`: respon yang dikembalikan.
- `bodyType=INLINE` untuk body string literal; bisa juga `FILE` utk body dari file.

### 6.4 Menjalankan mock manual (debug)

Untuk menguji file environment tanpa menjalankan seluruh suite:

```bash
mockoon-cli start --data src/test/resources/mockoon/aob-external-mockoon.json --port 3000
```

lalu cek dengan curl:

```bash
curl -i -X POST http://127.0.0.1:3000/api/updateMigrationPkPmk
```

### 6.5 Opsi Docker (tanpa install Node.js)

Mockoon menyediakan image Docker resmi sehingga tidak perlu install Node.js / npm di mesin.

**Dockerfile (opsional, untuk custom image):**

```dockerfile
FROM mockoon/cli:latest
COPY src/test/resources/mockoon/aob-external-mockoon.json /data/env.json
CMD ["start", "--data", "/data/env.json", "--port", "3000", "--disable-tls", "--max-transaction-logs", "0"]
```

**Jalankan langsung dengan Docker:**

```bash
docker run -d \
  --name mockoon-mock \
  -p 3000:3000 \
  -v $(pwd)/src/test/resources/mockoon:/data \
  mockoon/cli:latest \
  start --data /data/aob-external-mockoon.json --port 3000 --disable-tls --max-transaction-logs 0
```

**Parameter penting:**

| Parameter | Deskripsi |
|-----------|-----------|
| `-p 3000:3000` | Map port container ke host |
| `-v $(pwd)/src/test/resources/mockoon:/data` | Mount folder mock ke container |
| `mockoon/cli:latest` | Image resmi Mockoon CLI |
| `--disable-tls` | Matikan TLS (untuk testing lokal) |

**Stop & hapus container:**

```bash
docker stop mockoon-mock && docker rm mockoon-mock
```

### 6.6 Opsi Docker Compose (recommended untuk CI/CD)

Buat file `docker-compose.yml` di root project:

```yaml
version: "3.8"

services:
  mockoon:
    image: mockoon/cli:latest
    container_name: mockoon-mock
    ports:
      - "3000:3000"
    volumes:
      - ./src/test/resources/mockoon:/data
    command: >
      start
      --data /data/aob-external-mockoon.json
      --port 3000
      --disable-tls
      --max-transaction-logs 0
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 5s
      timeout: 3s
      retries: 5

  # Opsional: jalankan application test bersamaan
  # app-test:
  #   build: .
  #   depends_on:
  #     mockoon:
  #       condition: service_healthy
  #   environment:
  #     - MOCK_SERVER_URL=http://mockoon:3000
```

**Commands:**

```bash
# Start background
docker compose up -d

# Lihat log
docker compose logs -f mockoon

# Stop & hapus
docker compose down

# Stop & hapus beserta volumes
docker compose down -v
```

### 6.7 Perbandingan opsi Mockoon

| Aspek | CLI (Node.js) | Docker | Docker Compose |
|-------|---------------|--------|----------------|
| **Install** | `npm install -g @mockoon/cli` | `docker pull mockoon/cli` | `docker compose` |
| **Dependensi** | Node.js 18+ | Docker saja | Docker + Docker Compose |
| **Portability** | Tergantung OS | Cross-platform | Cross-platform |
| **CI/CD** | Perlu install Node | Tinggal pull image | Definisikan di compose |
| **Isolation** | Proses lokal | Container terpisah | Multi-service orchestration |
| **Health check** | Manual (TCP polling) | Manual | Built-in healthcheck |
| **Multiple mocks** | 1 proses per mock | 1 container per mock | Multi-container setup |

### 6.8 Integrasi dengan MockoonServer.java

Untuk menggunakan Docker di `MockoonServer.java`, modifikasi method `start()`:

```java
// Opsi 1: Gunakan Docker via ProcessBuilder
private static void startDocker() {
    ProcessBuilder pb = new ProcessBuilder(
        "docker", "run", "-d",
        "--name", "mockoon-mock",
        "-p", String.valueOf(port) + ":" + port,
        "-v", resolveMockPath() + ":/data",
        "mockoon/cli:latest",
        "start", "--data", "/data/" + resolveMockFileName(),
        "--port", String.valueOf(port),
        "--disable-tls",
        "--max-transaction-logs", "0"
    );
    pb.start();
    waitForPort(port);
}

// Opsi 2: Gunakan Docker Compose
private static void startDockerCompose() {
    ProcessBuilder pb = new ProcessBuilder(
        "docker", "compose", "up", "-d", "mockoon"
    );
    pb.directory(new File("."));
    pb.start();
    waitForPort(port);
}
```

**System properties tambahan untuk Docker:**

| Property | Default | Ket |
|----------|---------|-----|
| `mockoon.mode` | `cli` | `cli`, `docker`, atau `docker-compose` |
| `mockoon.docker.image` | `mockoon/cli:latest` | Image Docker |
| `mockoon.docker.containerName` | `mockoon-mock` | Nama container |

---
## 7. Integrasi Allure

### 7.1 Ringkasan alur

```
Cucumber scenario dijalankan
   -> allure-cucumber7-jvm (plugin di cucumber.properties) menulis hasil mentah
      ke target/allure-results/  (sesuai allure.results.directory)
   -> plugin allure-maven membuat laporan dari folder tsb
```

### 7.2 Yang harus ada

1. **Dependensi** di `pom.xml` (lihat Bab 3):
   - `io.qameta.allure:allure-cucumber7-jvm` (adapter hasil ke folder)
   - `io.qameta.allure:allure-junit-platform` (listener JUnit Platform)
   - `allure-bom` di `dependencyManagement` agar versi konsisten.
1. **Plugin** `io.qameta.allure:allure-maven` (versi `2.12.0`) di `<build><plugins>`.
   - **Allure 3**: Tidak perlu konfigurasi tambahan (default)
   - **Allure 2**: Tambahkan `<reportVersion>2.39.0</reportVersion>`
1. **Registrasi listener** di `cucumber.properties`:
   ```properties
   cucumber.plugin=pretty,io.qameta.allure.cucumber7jvm.AllureCucumber7Jvm
   ```
1. **Folder hasil** di `allure.properties` (Allure 2) atau `allurerc.*` (Allure 3):
   ```properties
   # Allure 2
   allure.results.directory=target/allure-results
   ```

> **Allure 3 - Maven Only**: Tidak perlu install Node.js, npm, atau npx.
> Plugin `allure-maven` akan memprovision semua secara otomatis melalui Maven.

### 7.3 Generate & lihat laporan

**Allure 3 (default):**

```bash
mvn test -Dtest=CucumberTest
mvn allure:report     # menghasilkan laporan statis di target/site/allure-maven/index.html
mvn allure:serve      # membuka laporan di browser (server lokal sementara)
```

**Allure 2 (legacy):**

```bash
mvn test -Dtest=CucumberTest
mvn allure:report     # menghasilkan laporan statis di target/allure-report/index.html
mvn allure:serve      # membuka laporan di browser (server lokal sementara)
```

**Parameter command line:**

```bash
# Override report version
mvn -Dreport.version=3.4.1 allure:report

# Override port serve
mvn -Dallure.serve.port=9090 allure:serve
```

Catatan path default:
- Hasil mentah: `target/allure-results/`
- Laporan HTML (Allure 3): `target/site/allure-maven/index.html`
- Laporan HTML (Allure 2): `target/allure-report/index.html`

### 7.4 Konfigurasi Allure 3 (allurerc)

Allure 3 mendukung config files: `allurerc.js`, `allurerc.mjs`, `allurerc.cjs`, `allurerc.json`, `allurerc.yaml`, `allurerc.yml`.

Contoh `allurerc.json`:

```json
{
  "reportName": "AOB Test Report",
  "outputFolder": "target/site/allure-maven",
  "singleFile": true
}
```

Contoh `allurerc.yaml`:

```yaml
reportName: "AOB Test Report"
outputFolder: "target/site/allure-maven"
singleFile: true
history:
  enabled: true
```

**Allure 3 Maven plugin properties:**

| Property | Default | Deskripsi |
|----------|---------|-----------|
| `allure.install.directory` | `${project.basedir}/.allure` | Lokasi instalasi runtime (managed Maven) |
| `allure.node.version` | `v24.14.1` | Versi Node.js internal (auto-provision) |
| `allure.npm.registry` | `https://registry.npmjs.org` | NPM registry (untuk download package) |
| `allure.config.path` | auto-detect | Path ke config file (`allurerc.*`) |
| `allure.history.enabled` | `true` | Aktifkan trend history |

> **Catatan**: Semua properties di atas dikonfigurasi melalui Maven plugin, bukan npx atau CLI manual.
> Plugin `allure-maven` menangani provisioning, instalasi, dan eksekusi secara otomatis.

### 7.5 Opsi tambahan

- Tambahkan `@allure.id` / `@allure.label.*` dll sebagai tag di feature utk memperkaya laporan
  (contoh: `@allure.label.tag:smoke`).
- Untuk CI, gunakan jalur `mvn allure:report` lalu publish folder hasil laporan
  (Allure 3: `target/site/allure-maven/`, Allure 2: `target/allure-report/`).
- Allure 3 menyimpan runtime di `.allure/` (di root project) - tambahkan ke `.gitignore`:
  ```
  .allure/
  ```

---
## 8. Workflow A â€” Setup Cucumber Test dari Nol (project lain)

Ikuti urutan ini pada project Quarkus baru / lain:

1. **Tambahkan dependensi test** di `pom.xml` (Bab 3): `rest-assured`, `quarkus-cucumber`
   (`io.quarkiverse.cucumber:quarkus-cucumber`), `allure-cucumber7-jvm`, `allure-junit-platform`.
   Tambahkan `allure-maven` plugin (versi `2.12.0`) dan `allure-bom` di dependencyManagement.
   - **Allure 3** (default): `allure.version=3.4.1`
   - **Allure 2** (legacy): `allure.version=2.29.1` + `reportVersion=2.39.0`
2. **Install Mockoon** (salah satu opsi):
   - **Opsi A - CLI**: `npm install -g @mockoon/cli` (Bab 6.1)
   - **Opsi B - Docker**: `docker pull mockoon/cli:latest` (Bab 6.5)
   - **Opsi C - Docker Compose**: Buat `docker-compose.yml` (Bab 6.6)
3. **Buat folder resources** `src/test/resources/` dan file:
   - `cucumber.properties` (Bab 5.2)
   - `allure.properties` (Allure 2) atau `allurerc.json` di root project (Allure 3) (Bab 5.3)
4. **Buat package step** dan tambahkan:
   - `TestContext.java` (`@ScenarioScope`, Bab 5.5) untuk state per scenario.
   - `CommonStepDefinitions.java` (Bab 5.4) dengan step generik `Given/When/Then`.
   Buatlah step sesuai kebutuhan endpoint (GET/POST/multipart/assert JSON).
5. **Salin util mock** `MockoonServer.java` dan sesuaikan `DEFAULT_CLI` dengan lokasi
   `npm root -g` di mesin Anda (Bab 6.2).
6. **Buat runner** `CucumberTest.java` (Bab 5.1) extends `CucumberQuarkusTest`, wire
   `@BeforeAll`/`@AfterAll` ke `MockoonServer.start()/shutdown()`.
7. **Buat file environment mockoon** `src/test/resources/mockoon/<name>.json`
   dengan route endpoint eksternal yang Anda butuhkan (Bab 6.3).
8. **Overwrite URL eksternal** aplikasi ke mock: buat file config test
   (`deployment/config/application-test.properties`) dan arahkan setiap URL upstream
   (mis. `aob-transaction.url.start-bpm`) ke `http://127.0.0.1:3000/<path>` (Bab 9.1).
   Lalu load file tsb via `quarkus.config.locations` di `application.properties` (test).
9. **Tulis feature file** `src/test/resources/features/<modul>/<Nama>.feature` (Bab 9.3).
10. **Jalankan**: `mvn test -Dtest=CucumberTest` lalu `mvn allure:serve` utk laporan.

> Jangan lupa `cucumber.glue` di `cucumber.properties` mengacu ke package step Anda,
> dan `cucumber.features` mengacu ke folder `features/` yang benar.

---

## 9. Workflow B â€” Menambahkan Endpoint Baru (suite yang sudah ada)

Ada dua kemungkinan untuk endpoint baru: (a) **endpoint baru di aplikasi ini** yang
bisa ditest langsung dengan feature file; dan (b) **endpoint eksternal yang dipanggil**
aplikasi, yang perlu dimock. Ikuti bagian sesuai kasus.

### 9.1 (b) Menambahkan mock untuk endpoint eksternal

1. Buka `src/test/resources/mockoon/aob-external-mockoon.json`.
2. Tambahkan satu objek route ke array `routes` (Bab 6.3): set `method`, `endpoint`,
   `responses[].statusCode`, dan `responses[].body`.
3. Di file `deployment/config/application-test.properties`, tambahkan key URL baru
   yang menunjuk ke mock tsb, misal:
   ```properties
   aob-transaction.url.my-new-call=${URL_MY_NEW_CALL:http://127.0.0.1:3000/api/myNewCall}
   ```
   Default-nya `http://127.0.0.1:3000` -> port Mockoon. Env var `URL_MY_NEW_CALL`
   tetap bisa meng-override ke env asli saat dibutuhkan.

   Ganti nama key (`my-new-call`) dan path mock sesuai kebutuhan nyata Anda.

### 9.2 (a) Endpoint baru di aplikasi ini

Tambahkan key config bila endpoint memakai URL yang dapat dikonfigurasi, tapi umumnya
cukup dengan feature file baru (Bab 9.3).

### 9.3 Menulis feature file

Letakkan di folder yang sesuai, mis. `src/test/resources/features/transaction/`.
Contoh pola dengan step generik yang sudah ada:

```gherkin
@transaction @myfeature @endpoint @happy
Feature: My new endpoint (transaction module)
  Endpoint base: /aob-transaction/myfeature

  Background:
    Given the request content type is "application/json"
    And the expected response content type is "application/json"

  Scenario: POST myfeature happy path
    When a POST request is sent to "/aob-transaction/myfeature"
      And the request body is:
      """
      { "body": { "npaNo": "NPA000001" } }
      """
    Then the response status code is 200
      And the response JSON at "$.status" is 200
      And the response JSON at "$.data" is not null
      And the response JSON at "$.timestamp" is a string
```

Poin penting:
- Gunakan tag konsisten (`@transaction`, `@<modul>`, `@happy`, ...) agar bisa difilter
  via `cucumber.tags` / `-Dcucumber.filter.tags`.
- Jika respon bervariasi per input, pakai `Scenario Outline` + `Examples` (lihat
  `transaction-Document.feature`).
- Jika ada step yang belum tersedia, tambahkan satu @Then/@Given baru di
  `CommonStepDefinitions.java` sesuai pola yang ada (Bab 5.4).

### 9.4 Menjalankan & memverifikasi

```bash
mvn test -Dtest=CucumberTest -Dcucumber.filter.tags="@myfeature"
mvn allure:serve
```

Lihat log untuk status / body bila assert gagal (error message menyertakan BODY).

---
## 10. Troubleshooting & Cheatsheet

### 10.1 Command yang sering dipakai

| Tujuan | Command |
|--------|---------|
| Jalankan seluruh suite | `mvn test -Dtest=CucumberTest` |
| Jalankan subset berdasarkan tag | `mvn test -Dtest=CucumberTest -Dcucumber.filter.tags="@smoke"` |
| Lihat laporan Allure (browser) | `mvn allure:serve` |
| Generate laporan statis Allure | `mvn allure:report` |
| Uji mock manual (CLI) | `mockoon-cli start --data <env.json> --port 3000` |
| Uji mock manual (Docker) | `docker run -d -p 3000:3000 -v $(pwd)/src/test/resources/mockoon:/data mockoon/cli:latest start --data /data/env.json --port 3000` |
| Mockoon via Docker Compose | `docker compose up -d mockoon` |
| Stop Docker Compose | `docker compose down` |

### 10.2 Error umum & solusi

| Gejala | Penyebab | Solusi |
|--------|----------|--------|
| `Mockoon CLI not found at ...` | `mockoon.cli` / `DEFAULT_CLI` salah | Install `@mockoon/cli` global, cek `npm root -g`, set `mockoon.cli` |
| `Mockoon server did not start on ...:3000` | Port dipakai / Node tidak ada | Cek port bebas, set `mockoon.port`, pastikan `node` di PATH |
| `Cannot connect to Docker daemon` | Docker tidak jalan / tidak terinstall | Install Docker, pastikan Docker daemon berjalan |
| `Port is already allocated` (Docker) | Port sudah dipakai container lain | `docker ps` untuk cek, `docker stop <container>` atau ganti port |
| `No such image: mockoon/cli` | Image belum di-pull | `docker pull mockoon/cli:latest` |
| `Step not defined` / `Undefined step` | Step belum ada di CommonStepDefinitions | Tambah @Given/@When/@Then baru (Bab 5.4) |
| Tidak ada scenario di laporan Allure | `cucumber.plugin` tidak mencantumkan listener Allure | Tambahkan `io.qameta.allure.cucumber7jvm.AllureCucumber7Jvm` |
| Response URL kembali ke env asli | URL belum di-override ke Mockoon | Tambah key `aob-transaction.url.*` di `application-test.properties` & `quarkus.config.locations` |
| Assert gagal padahal data benar | JSON path / tipe salah | Debug body lewat error message (menyertakan BODY), pakai `is one of` utk nilai bervariasi |

### 10.3 Lokasi file penting (proyek ini)

- Runner: `src/test/java/com/prudential/pruforce/aob/CucumberTest.java`
- Mock helper: `src/test/java/com/prudential/pruforce/aob/MockoonServer.java`
- Steps: `src/test/java/com/prudential/pruforce/aob/steps/*.java`
- Config: `src/test/resources/{cucumber,allure,application}.properties`
- Feature: `src/test/resources/features/transaction/*.feature`
- Environment mock: `src/test/resources/mockoon/aob-external-mockoon.json`
- Override URL eksternal: `deployment/config/application-test.properties`
- Hasil test: `target/allure-results/`
- Laporan HTML (Allure 3): `target/site/allure-maven/index.html`
- Laporan HTML (Allure 2): `target/allure-report/index.html`

---

## 11. Referensi

- Quarkus Cucumber (io.quarkiverse.cucumber): https://github.com/quarkiverse/quarkus-cucumber
- Allure Report: https://allurereport.org
- Allure Report Docs: https://allurereport.org/docs/
- Allure Maven Plugin: https://github.com/allure-framework/allure-maven
- Allure Cucumber JVM adapter: https://github.com/allure-framework/allure-jvm
- Mockoon CLI: https://mockoon.com/docs/latest/mockoon-cli/
- Mockoon Docker: https://mockoon.com/docs/latest/docker/
- REST Assured: https://rest-assured.io

---

*Dokumen ini disusun berdasarkan konfigurasi nyata pada project `ptpla-cbv-pf-aob-service-v2`
(branch `feature/PLAIPRO-36351-test`).*
