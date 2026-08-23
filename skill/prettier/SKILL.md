---
name: prettier
description: Use when setting up, configuring, running, or debugging Java code formatting with HubSpot prettier-maven-plugin (mvn prettier:write, mvn prettier:check, pom.xml prettier configuration) — covers plugin goals, Maven XML setup, -D property overrides, and Node/prettier-java version options.
---

# Prettier for Java via prettier-maven-plugin

Maven plugin that runs [prettier-java](https://github.com/jhipster/prettier-java) during a build (`com.hubspot.maven.plugins:prettier-maven-plugin`, source at https://github.com/HubSpot/prettier-maven-plugin). It downloads Node, prettier, and prettier-plugin-java automatically from nodejs.org and npm as needed, so no local Node install is required.

## Goals

- `mvn prettier:write` — reformat sources in place.
- `mvn prettier:check` — fail the build if files are unformatted.
- `mvn prettier:print-args` — print resolved configuration; use this first when debugging config.

Common convention: bind the `write` goal for local builds and switch to `check` in CI via a profile-activated property.

## pom.xml setup

```xml
<properties>
  <plugin.prettier.goal>write</plugin.prettier.goal>
</properties>

<build>
  <plugins>
    <plugin>
      <groupId>com.hubspot.maven.plugins</groupId>
      <artifactId>prettier-maven-plugin</artifactId>
      <version>0.16</version>
      <configuration>
        <prettierJavaVersion>2.0.0</prettierJavaVersion>
        <printWidth>90</printWidth>
        <tabWidth>2</tabWidth>
        <useTabs>false</useTabs>
        <inputGlobs>
          <inputGlob>src/main/java/**/*.java</inputGlob>
          <inputGlob>src/test/java/**/*.java</inputGlob>
        </inputGlobs>
      </configuration>
      <executions>
        <execution>
          <phase>validate</phase>
          <goals>
            <goal>${plugin.prettier.goal}</goal>
          </goals>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>

<profiles>
  <profile>
    <id>ci</id>
    <activation>
      <property>
        <name>env.CI</name>
      </property>
    </activation>
    <properties>
      <plugin.prettier.goal>check</plugin.prettier.goal>
    </properties>
  </profile>
</profiles>
```

Omit `<inputGlobs>` entirely unless overriding; the defaults are already `src/{main,test}/java/**/*.java`.

## Options

| Option | -D property | Default | Notes |
| --- | --- | --- | --- |
| skip | – | false | Skip plugin execution |
| fail | – | true | check only: fail on unformatted files |
| generateDiff | – | false | check only: requires `sh` and `diff` in PATH |
| diffGenerator | prettier.diffGenerator | – | Custom `DiffGenerator` implementation |
| nodeVersion | prettier.nodeVersion | 16.13.1 | Node version used to run prettier |
| nodePath | prettier.nodePath | – | Own node executable; set to `node` to use PATH |
| npmPath | prettier.npmPath | – | Own npm executable; set to `npm` to use PATH |
| prettierJavaVersion | prettier.prettierJavaVersion | 0.7.0 | prettier-plugin-java version |
| printWidth | prettier.printWidth | null | Passed as `--print-width` |
| tabWidth | prettier.tabWidth | null | Passed as `--tab-width` |
| useTabs | prettier.useTabs | null | Passed as `--use-tabs` |
| endOfLine | prettier.endOfLine | null | Passed as `--end-of-line` |
| ignoreConfigFile | prettier.ignoreConfigFile | false | Invokes prettier with `--no-config` |
| ignoreEditorConfig | prettier.ignoreEditorConfig | false | Invokes prettier with `--no-editorconfig` |
| inputGlobs | prettier.inputGlobs | src/{main,test}/java/**/*.java | Comma-separated list on the CLI |
| disableGenericsLinebreaks | prettier.disableGenericsLinebreaks | false | Prevents linebreaks inside generic type declarations |

## Command-line recipes

Format with extra directories/file types without editing pom.xml:

```sh
mvn prettier:write '-Dprettier.inputGlobs=src/main/java/**/*.java,src/test/java/**/*.java,src/main/js/**/*.js'
```

Check with a wider line length:

```sh
mvn prettier:check -Dprettier.printWidth=120
```

## Notes and troubleshooting

- Verify effective settings with `mvn prettier:print-args` before debugging anything else.
- A normal prettier config file (`.prettierrc`) is honored unless `ignoreConfigFile=true`; `.editorconfig` unless `ignoreEditorConfig=true`.
- `generateDiff=true` fails if `sh` or `diff` are not on PATH.
- Corporate proxies can block automatic Node/npm downloads; supply `nodePath`/`npmPath` pointing at pre-provisioned executables instead.
- `disableGenericsLinebreaks` works by patching prettier-plugin-java after download; on brand-new prettier-java versions the bundled patch may lag behind.
