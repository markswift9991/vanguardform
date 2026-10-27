import { access, cp, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildRoot = resolve(projectRoot, "cpanel-php");
const archivePath = resolve(projectRoot, "..", "..", "vanguard-velocity-php-cpanel.zip");

for (const path of [
  resolve(projectRoot, "dist/index.html"),
  resolve(projectRoot, "api/index.php"),
  resolve(projectRoot, "api/.htaccess"),
  resolve(projectRoot, "server/certs/aiven-ca.pem"),
  resolve(projectRoot, "server/schema.sql"),
  resolve(projectRoot, "server/.htaccess"),
  resolve(projectRoot, "server/migrations/010_telegram_notifications.sql"),
]) {
  try {
    await access(path);
  } catch {
    throw new Error(`Missing required build input: ${path}`);
  }
}

await rm(buildRoot, { recursive: true, force: true });
await mkdir(buildRoot, { recursive: true });
await cp(resolve(projectRoot, "dist"), buildRoot, { recursive: true });
await cp(resolve(projectRoot, "api"), resolve(buildRoot, "api"), { recursive: true });
await cp(resolve(projectRoot, "server/migrations"), resolve(buildRoot, "server/migrations"), { recursive: true });
await cp(resolve(projectRoot, "server/schema.sql"), resolve(buildRoot, "server/schema.sql"));
await cp(resolve(projectRoot, "server/.htaccess"), resolve(buildRoot, "server/.htaccess"));
await mkdir(resolve(buildRoot, "server/certs"), { recursive: true });
await cp(
  resolve(projectRoot, "server/certs/aiven-ca.pem"),
  resolve(buildRoot, "server/certs/aiven-ca.pem"),
);
for (const filename of [".htaccess", ".user.ini", ".env.example", "CPANEL-DEPLOY.md", "README.md"]) {
  await cp(resolve(projectRoot, filename), resolve(buildRoot, filename));
}

await rm(archivePath, { force: true });
const result = spawnSync("zip", ["-qr", archivePath, "."], {
  cwd: buildRoot,
  stdio: "inherit",
});
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(`zip exited with status ${result.status ?? "unknown"}`);
}

await rm(buildRoot, { recursive: true, force: true });
console.log(`Created ${archivePath}`);
