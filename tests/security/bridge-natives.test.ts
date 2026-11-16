import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The bridge runs in the page's world. A method call that is not on the
 * captured `native` object uses whatever the page put on the prototype.
 */
describe("bridge builtins", () => {
  const source = readFileSync(resolve(__dirname, "../../src/content/walletBridge.ts"), "utf8");
  const regionStart = source.indexOf("/* page-natives */");
  const regionEnd = source.indexOf("/* end-page-natives */");

  it("captures the builtins before page scripts, and only calls those", () => {
    expect(regionStart).toBeGreaterThan(0);
    expect(regionEnd).toBeGreaterThan(regionStart);
    const file = ts.createSourceFile("walletBridge.ts", source, ts.ScriptTarget.Latest, true);
    const saved = new Set<string>();
    const bad: string[] = [];
    const lineOf = (pos: number) => source.slice(0, pos).split("\n").length;
    const forbidden = new Set([
      "getComputedStyle",
      "setTimeout",
      "setInterval",
      "String",
      "Array",
      "Object",
      "JSON",
      "Promise",
      "BigInt",
      "RegExp",
      "Date",
    ]);
    const constructors = new Set([
      "Set",
      "WeakSet",
      "WeakRef",
      "Error",
      "RegExp",
      "Blob",
      "ClipboardItem",
      "Map",
      "Promise",
      "URL",
      "Worker",
      "Array",
      "Object",
      "Date",
    ]);

    const visit = (node: ts.Node): void => {
      const pos = node.getStart(file);
      const inRegion = pos >= regionStart && pos < regionEnd;
      if (inRegion && ts.isPropertyAssignment(node) && ts.isIdentifier(node.name)) saved.add(node.name.text);
      if (!inRegion && ts.isPropertyAccessExpression(node)) {
        const watched = new Set(["innerText", "textContent", "isTrusted", "shadowRoot", "height", "width", "top", "bottom"]);
        if (watched.has(node.name.text) && !(ts.isIdentifier(node.expression) && node.expression.text === "native")) {
          bad.push(`${lineOf(pos)} .${node.name.text}`);
        }
      }
      if (!inRegion && ts.isCallExpression(node)) {
        const callee = node.expression;
        if (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) {
          const obj = callee.expression;
          const throughNative = ts.isIdentifier(obj) && obj.text === "native";
          if (!throughNative) {
            const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : "[]";
            bad.push(`${lineOf(pos)} .${name}()`);
          } else if (ts.isPropertyAccessExpression(callee) && !saved.has(callee.name.text)) {
            bad.push(`${lineOf(pos)} native.${callee.name.text}() is not captured`);
          }
        } else if (ts.isIdentifier(callee) && forbidden.has(callee.text)) {
          bad.push(`${lineOf(pos)} ${callee.text}()`);
        }
      }
      if (!inRegion && ts.isNewExpression(node)) {
        const made = node.expression;
        if (ts.isIdentifier(made) && constructors.has(made.text)) bad.push(`${lineOf(pos)} new ${made.text}`);
        if (ts.isPropertyAccessExpression(made) && !(ts.isIdentifier(made.expression) && made.expression.text === "native")) {
          bad.push(`${lineOf(pos)} new .${made.name.text}`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
    expect(saved.has("exec")).toBe(true);
    expect(saved.has("innerText")).toBe(true);
    expect(saved.has("now")).toBe(true);
    expect(saved.has("getBoundingClientRect")).toBe(true);
    expect(bad).toEqual([]);
  });
});
