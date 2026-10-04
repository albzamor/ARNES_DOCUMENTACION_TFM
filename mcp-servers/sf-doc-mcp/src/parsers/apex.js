import fs from "node:fs";
import path from "node:path";

/** Strips /* *\/ and // comments so they don't pollute signature matching, while keeping ApexDoc blocks separately extracted first. */
function extractApexDocComments(source) {
  // Map of "line index after which this doc comment ends" -> comment text,
  // so we can associate a /** ... */ block with the declaration right after it.
  const docs = [];
  const re = /\/\*\*([\s\S]*?)\*\//g;
  let m;
  while ((m = re.exec(source))) {
    const text = m[1]
      .split("\n")
      .map((l) => l.replace(/^\s*\*\s?/, "").trim())
      .filter((l) => l.length > 0 && !l.startsWith("@"))
      .join(" ");
    docs.push({ endIndex: re.lastIndex, text });
  }
  return docs;
}

function nearestDocFor(docs, matchIndex, source) {
  // Find a doc comment block whose end sits shortly before matchIndex, allowing
  // only whitespace and annotation lines (e.g. @InvocableMethod) in between.
  for (const d of docs) {
    if (d.endIndex <= matchIndex) {
      const between = source.slice(d.endIndex, matchIndex).replace(/@\w+(\([^)]*\))?/g, "");
      if (/^\s*$/.test(between)) return d.text;
    }
  }
  return null;
}

/**
 * Replaces the contents of every comment with spaces (keeping newlines and
 * overall string length intact) so structural regexes never match text that
 * only appears inside a comment, while indices still line up with `source`.
 */
function blankOutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
}

/**
 * True if `annotationName` appears in the gap between the end of the
 * previous statement (last `}` or `;`) and matchIndex -- i.e. it directly
 * decorates the declaration at matchIndex, not some earlier member.
 */
function hasImmediateAnnotation(code, matchIndex, annotationName) {
  let boundary = -1;
  for (let i = matchIndex - 1; i >= 0; i--) {
    if (code[i] === "}" || code[i] === ";") {
      boundary = i;
      break;
    }
  }
  const segment = code.slice(boundary + 1, matchIndex);
  return new RegExp(annotationName, "i").test(segment);
}

/**
 * Parses an Apex class (.cls) into a normalized, documentation-friendly
 * structure via regex-based extraction (ApexDoc-style header comments,
 * class declaration, and public/global method signatures).
 */
export function parseApex(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const name = path.basename(filePath, ".cls");
  const docs = extractApexDocComments(source);
  // All structural matching runs against a comment-blanked copy so words like
  // "class" appearing inside a description comment can never be mistaken for code.
  const code = blankOutComments(source);

  const classMatch = code.match(
    /(public|global|private)?\s*(with sharing|without sharing|inherited sharing)?\s*(virtual|abstract)?\s*class\s+(\w+)/
  );
  const isTestClassAnywhereNearTop = /@isTest/i.test(source.split("\n").slice(0, 5).join("\n"));

  const description = classMatch ? nearestDocFor(docs, classMatch.index, source) : null;

  const methodRe =
    /(?:^|\n)\s*(global|public)\s+(?:static\s+)?(?:override\s+)?(?:virtual\s+)?([\w<>[\],\s]+?)\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
  const methods = [];
  let mm;
  while ((mm = methodRe.exec(code))) {
    const [full, access, returnType, methodName, params] = mm;
    if (methodName === classMatch?.[4]) continue; // skip constructor matches picked up accidentally
    const matchIndex = mm.index + full.indexOf(access);
    methods.push({
      name: methodName,
      accessModifier: access,
      returnType: returnType.trim(),
      params: params.trim(),
      description: nearestDocFor(docs, matchIndex, source),
      isInvocable: hasImmediateAnnotation(code, matchIndex, "@InvocableMethod")
    });
  }

  const fieldRe = /(?:^|\n)\s*(global|public)\s+(?:static\s+)?(?:final\s+)?([\w<>[\],]+)\s+(\w+)\s*(=|;)/g;
  const fields = [];
  let fm;
  while ((fm = fieldRe.exec(code))) {
    const [, access, type, fieldName] = fm;
    if (methods.some((m) => m.name === fieldName)) continue;
    fields.push({ name: fieldName, accessModifier: access, type });
  }

  return {
    type: "Apex Class",
    filePath,
    name: classMatch ? classMatch[4] : name,
    description,
    accessModifier: classMatch ? classMatch[1] || "private" : null,
    sharingModel: classMatch ? classMatch[2] || null : null,
    isTestClass: isTestClassAnywhereNearTop,
    methods,
    fields
  };
}
