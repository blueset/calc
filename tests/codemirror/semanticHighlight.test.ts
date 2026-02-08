import { Calculator } from "@/calculator/calculator";
import { DataLoader } from "@/calculator/data-loader";
import { buildSemanticTree } from "@/codemirror/semanticHighlight";
import { beforeAll, describe, expect, it } from "vitest";

/** Collect all non-top nodes from a Lezer tree */
function collectNodes(tree: ReturnType<typeof buildSemanticTree>) {
  const nodes: { name: string; from: number; to: number }[] = [];
  tree.iterate({
    enter(node) {
      if (!node.type.isTop) {
        nodes.push({ name: node.name, from: node.from, to: node.to });
      }
    },
  });
  return nodes;
}

function nodeText(node: { from: number; to: number }, doc: string) {
  return doc.substring(node.from, node.to);
}

describe("Semantic Highlighting", () => {
  let calculator: Calculator;
  let dataLoader: DataLoader;

  beforeAll(async () => {
    dataLoader = new DataLoader();
    dataLoader.load();
    calculator = new Calculator(dataLoader, {});

    const mockExchangeRates = {
      date: "2024-01-01",
      usd: {
        eur: 0.85,
        gbp: 0.73,
        jpy: 110.0,
        hkd: 7.8,
        cad: 1.25,
        inr: 74.0,
      },
    };
    calculator.loadExchangeRates(mockExchangeRates);
  });

  it("should correctly identify AST and usages", () => {
    const DOCUMENT = `# Arithmetic
2 + 3 # inline comment
10 * 4 - 7
(100 + 50) / 3

# Units
5 km
170 cm to ft in
3.5 hours + 45 minutes

# Conversions
100 °F to °C
1 mile to km
5 kg to lbs

# Variables
width = 10 m
height = 5 m
area = width * height

# Date/time
2025.12.11 + 2 yr
12:30 to Tokyo
12:20 - 3 hours
12:45 UTC - 3 hour 3 minute
3 hour - 3 minute
11:35 New York + 30 hours
2025-12-31 12:30 to Tokyo
`;
    const ast = calculator.parse(DOCUMENT).ast;
    expect(ast).toBeDefined();

    const tree = buildSemanticTree(ast, DOCUMENT);
    const nodes = collectNodes(tree);

    // Check headings
    const headings = nodes.filter(n => n.name.startsWith('Heading'));
    expect(headings.map(n => nodeText(n, DOCUMENT))).toEqual([
      '# Arithmetic', '# Units', '# Conversions', '# Variables', '# Date/time'
    ]);

    // Check units
    const units = nodes.filter(n => n.name === 'Unit');
    const unitTexts = units.map(n => nodeText(n, DOCUMENT));
    expect(unitTexts).toContain('km');
    expect(unitTexts).toContain('cm');
    expect(unitTexts).toContain('ft');
    expect(unitTexts).toContain('in');
    expect(unitTexts).toContain('hours');
    expect(unitTexts).toContain('minutes');
    expect(unitTexts).toContain('°F');
    expect(unitTexts).toContain('°C');
    expect(unitTexts).toContain('mile');
    expect(unitTexts).toContain('kg');
    expect(unitTexts).toContain('lbs');
    expect(unitTexts).toContain('m');
    expect(unitTexts).toContain('yr');
    expect(unitTexts).toContain('hour');
    expect(unitTexts).toContain('minute');

    // Check variable definitions
    const varDefs = nodes.filter(n => n.name === 'VariableDefinition');
    const varDefTexts = varDefs.map(n => nodeText(n, DOCUMENT));
    expect(varDefTexts).toContain('width');
    expect(varDefTexts).toContain('height');
    expect(varDefTexts).toContain('area');

    // Check variable usages
    const vars = nodes.filter(n => n.name === 'Variable');
    const varTexts = vars.map(n => nodeText(n, DOCUMENT));
    expect(varTexts).toContain('width');
    expect(varTexts).toContain('height');

    // Check numbers
    const numbers = nodes.filter(n => n.name === 'Number');
    const numberTexts = numbers.map(n => nodeText(n, DOCUMENT));
    expect(numberTexts).toContain('2');
    expect(numberTexts).toContain('3');
    expect(numberTexts).toContain('10');
    expect(numberTexts).toContain('100');
    expect(numberTexts).toContain('3.5');

    // Check operators
    const operators = nodes.filter(n => n.name === 'Operator');
    const opTexts = operators.map(n => nodeText(n, DOCUMENT));
    expect(opTexts).toContain('+');
    expect(opTexts).toContain('*');
    expect(opTexts).toContain('-');
    expect(opTexts).toContain('/');

    // Check keywords (conversion operators)
    const keywords = nodes.filter(n => n.name === 'Keyword');
    const kwTexts = keywords.map(n => nodeText(n, DOCUMENT));
    expect(kwTexts).toContain('to');

    // Check date/time literals
    const dateTimes = nodes.filter(n => n.name === 'DateTime');
    const dtTexts = dateTimes.map(n => nodeText(n, DOCUMENT));
    expect(dtTexts).toContain('2025.12.11');        // PlainDate in BinaryExpr
    expect(dtTexts).toContain('12:30');              // PlainTime in Conversion
    expect(dtTexts).toContain('12:20');              // PlainTime in BinaryExpr
    expect(dtTexts).toContain('12:45 UTC');          // ZonedDateTime (single span)
    expect(dtTexts).toContain('11:35 New York');     // ZonedDateTime (single span)
    expect(dtTexts).toContain('2025-12-31 12:30');   // PlainDateTime in Conversion
    expect(dtTexts).toContain('Tokyo');              // TimezoneName (conversion target)

    // Verify all spans extract correct text (no overshoot)
    for (const node of nodes) {
      const text = nodeText(node, DOCUMENT);
      expect(node.from).toBeGreaterThanOrEqual(0);
      expect(node.to).toBeGreaterThan(node.from);
      expect(node.to).toBeLessThanOrEqual(DOCUMENT.length);
      expect(text).not.toContain('\n');
    }
  });

  it("should correctly highlight degree symbols without overshoot", () => {
    const doc = "100 °F to °C";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);
    const unitNodes = nodes.filter(n => n.name === 'Unit');

    expect(unitNodes.map(n => nodeText(n, doc))).toEqual(['°F', '°C']);
  });

  it("should correctly highlight bare degree symbol", () => {
    const doc = "90 °";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);
    const unitNodes = nodes.filter(n => n.name === 'Unit');

    expect(unitNodes.map(n => nodeText(n, doc))).toEqual(['°']);
  });

  it("should correctly highlight prime and double prime symbols", () => {
    const doc = `5 ' 11 "`;
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);
    const unitNodes = nodes.filter(n => n.name === 'Unit');

    expect(unitNodes.map(n => nodeText(n, doc))).toEqual(["'", '"']);
  });

  it("should highlight numbers in expressions", () => {
    const doc = "42 + 3.14";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);

    const numbers = nodes.filter(n => n.name === 'Number');
    expect(numbers.map(n => nodeText(n, doc))).toEqual(['42', '3.14']);

    const operators = nodes.filter(n => n.name === 'Operator');
    expect(operators.map(n => nodeText(n, doc))).toEqual(['+']);
  });

  it("should highlight conversion keywords", () => {
    const doc = "100 km to miles";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);

    const keywords = nodes.filter(n => n.name === 'Keyword');
    expect(keywords.map(n => nodeText(n, doc))).toEqual(['to']);
  });

  it("should highlight conditional keywords", () => {
    const doc = "if true then 1 else 0";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);

    const keywords = nodes.filter(n => n.name === 'Keyword');
    expect(keywords.map(n => nodeText(n, doc))).toEqual(['if', 'then', 'else']);

    const booleans = nodes.filter(n => n.name === 'BooleanLiteral');
    expect(booleans.map(n => nodeText(n, doc))).toEqual(['true']);
  });

  it("should highlight hex numbers", () => {
    const doc = "0xFF";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);

    const numbers = nodes.filter(n => n.name === 'Number');
    expect(numbers.map(n => nodeText(n, doc))).toEqual(['0xFF']);
  });

  it("should highlight constants", () => {
    const doc = "pi + e";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);

    const constants = nodes.filter(n => n.name === 'Constant');
    expect(constants.map(n => nodeText(n, doc))).toEqual(['pi', 'e']);
  });

  it("should highlight functions", () => {
    const doc = "sin(pi)";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);

    const funcs = nodes.filter(n => n.name === 'FunctionCall');
    expect(funcs.map(n => nodeText(n, doc))).toEqual(['sin']);

    const constants = nodes.filter(n => n.name === 'Constant');
    expect(constants.map(n => nodeText(n, doc))).toEqual(['pi']);
  });

  it("should highlight presentation formats", () => {
    const doc = "99 / 98 to fraction\n120 base 3 to base 9";
    const ast = calculator.parse(doc).ast;
    const tree = buildSemanticTree(ast, doc);
    const nodes = collectNodes(tree);

    const numbers = nodes.filter(n => n.name === 'Number');
    expect(numbers.map(n => nodeText(n, doc))).toContain('99');
    expect(numbers.map(n => nodeText(n, doc))).toContain('98');
    expect(numbers.map(n => nodeText(n, doc))).toContain('120 base 3');

    const operators = nodes.filter(n => n.name === 'Operator');
    expect(operators.map(n => nodeText(n, doc))).toEqual(['/']);

    const keywords = nodes.filter(n => n.name === 'Keyword');
    const kwTexts = keywords.map(n => nodeText(n, doc));
    expect(kwTexts).toContain('to');
    expect(kwTexts).toContain('fraction');
    expect(kwTexts).toContain('base 9');
  });
});
