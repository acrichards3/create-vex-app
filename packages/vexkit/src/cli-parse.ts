import { parseAndValidateVexDocument } from "./vex/parse-and-validate-vex-document";

async function readStdin(): Promise<string> {
  return new Response(Bun.stdin.stream()).text();
}

function formatErrors(lines: readonly { line: number; message: string }[]): string {
  return lines.map((e) => (e.line > 0 ? `Line ${String(e.line)}: ${e.message}` : e.message)).join("\n");
}

function parseParseArgs(argv: string[]): { json: boolean; pathOrDash: string } {
  let json = false;
  let i = 0;
  while (argv[i] === "--json") {
    json = true;
    i += 1;
  }

  return { json, pathOrDash: argv[i] ?? "" };
}

export async function runParseCommand(argvAfterParse: string[]): Promise<void> {
  const { json, pathOrDash } = parseParseArgs(argvAfterParse);
  if (pathOrDash === "") {
    const msg = "vexkit parse: missing file path or -\n";
    if (json) {
      await Bun.write(Bun.stdout, `${JSON.stringify({ errors: [{ line: 0, message: msg.trim() }], ok: false })}\n`);
    } else {
      await Bun.write(Bun.stderr, msg);
    }

    process.exitCode = 1;
    return;
  }

  let source: string;
  try {
    source = pathOrDash === "-" ? await readStdin() : await Bun.file(pathOrDash).text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (json) {
      await Bun.write(Bun.stdout, `${JSON.stringify({ errors: [{ line: 0, message }], ok: false })}\n`);
    } else {
      await Bun.write(Bun.stderr, `${message}\n`);
    }

    process.exitCode = 1;
    return;
  }

  const result = parseAndValidateVexDocument(source);

  if (json) {
    if (!result.ok || result.document == null) {
      await Bun.write(Bun.stdout, `${JSON.stringify({ errors: [...result.errors], ok: false })}\n`);
      process.exitCode = 1;
      return;
    }

    await Bun.write(Bun.stdout, `${JSON.stringify({ document: result.document, ok: true })}\n`);
    return;
  }

  if (!result.ok || result.document == null) {
    await Bun.write(Bun.stderr, `${formatErrors(result.errors)}\n`);
    process.exitCode = 1;
    return;
  }

  await Bun.write(Bun.stdout, `${JSON.stringify(result.document, null, 2)}\n`);
}
