import { Arr, LineNode } from "./types";

/**
 * Build a candidate AST tree from all candidate line nodes.
 * @param lineNodes All candidate ASTs
 */
export function buildCandidateTrees(lineNodes: LineNode[]): LineNode<Arr> {
  // Group candidates by their structure (type and key properties)
  const groups = groupCandidates(lineNodes);

  // Merge each group into a single node with alternatives
  const merged = groups.map((group) => mergeNodes(group));

  return merged as LineNode<Arr>;
}

/**
 * Group candidates by their top-level structure
 */
function groupCandidates(nodes: LineNode[]): LineNode[][] {
  const groups: Map<string, LineNode[]> = new Map();

  for (const node of nodes) {
    const key = getNodeKey(node);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(node);
  }

  return Array.from(groups.values());
}

/**
 * Generate a key for grouping nodes with the same structure
 */
function getNodeKey(node: LineNode): string {
  if (!node) return "null";

  switch (node.type) {
    case "Value":
      return `Value:${node.location}`;
    case "BinaryExpression":
      return `BinaryExpression:${node.operator}:${node.location}`;
    case "Variable":
      return `Variable:${node.name}:${node.location}`;
    case "FunctionCall":
      return `FunctionCall:${node.name}:${node.location}`;
    case "UnaryExpression":
      return `UnaryExpression:${node.operator}:${node.location}`;
    default:
      return node.type;
  }
}

/**
 * Merge multiple nodes with the same structure into one with alternatives
 */
function mergeNodes(nodes: any[]): any {
  if (nodes.length === 0) return null;
  if (!nodes[0]) return null;

  // Create result object with common properties
  const result: any = {};

  // Get all keys from all nodes
  const allKeys = new Set<string>();
  for (const node of nodes) {
    Object.keys(node).forEach((key) => allKeys.add(key));
  }

  // For each key, merge the values
  for (const key of allKeys) {
    const values = nodes.map((n) => n[key]);

    // Check if all values are the same primitive
    if (isPrimitive(values[0]) && values.every((v) => v === values[0])) {
      result[key] = values[0];
    } else if (isPrimitive(values[0])) {
      // Different primitives - shouldn't happen in well-grouped nodes
      result[key] = values[0];
    } else {
      // Complex values (objects/arrays) - merge them
      result[key] = mergePropertyValues(values);
    }
  }

  return result;
}

/**
 * Merge property values (objects or arrays) into alternatives
 */
function mergePropertyValues(values: any[]): any[] {
  // Remove undefined values
  const definedValues = values.filter((v) => v !== undefined && v !== null);
  if (definedValues.length === 0) return [];

  // Check if we can merge these values into a single object
  if (canMergeObjects(definedValues)) {
    // All values are objects with the same structure - merge them
    const merged = mergeObjects(definedValues);
    return [merged];
  }

  // Otherwise, wrap each value individually
  return definedValues.map((v) => wrapValue(v));
}

/**
 * Check if objects can be merged (same type and structure)
 */
function canMergeObjects(values: any[]): boolean {
  if (values.length === 0) return false;
  if (!values.every((v) => typeof v === "object" && v !== null && !Array.isArray(v))) {
    return false;
  }

  // Check if all objects have the same type
  const firstType = values[0].type;
  if (!firstType) return false;

  return values.every((v) => v.type === firstType);
}

/**
 * Merge multiple objects with the same type into one with alternatives
 */
function mergeObjects(objects: any[]): any {
  if (objects.length === 0) return null;

  const result: any = {};

  // Get all keys
  const allKeys = new Set<string>();
  for (const obj of objects) {
    Object.keys(obj).forEach((key) => allKeys.add(key));
  }

  // Merge each property
  for (const key of allKeys) {
    const values = objects.map((o) => o[key]);

    // If all values are the same primitive, keep it as-is
    if (isPrimitive(values[0]) && values.every((v) => v === values[0])) {
      result[key] = values[0];
    } else if (isPrimitive(values[0])) {
      // Different primitives - take the first one (or could be an error)
      result[key] = values[0];
    } else if (Array.isArray(values[0])) {
      // Array properties - collect alternatives
      result[key] = collectArrayAlternatives(values);
    } else {
      // Object properties - recursively merge or collect alternatives
      result[key] = mergePropertyValues(values);
    }
  }

  return result;
}

/**
 * Collect alternatives for array properties
 */
function collectArrayAlternatives(arrays: any[][]): any[][] {
  // Collect unique arrays based on deep equality
  const unique: any[][] = [];
  const seen = new Set<string>();

  for (const arr of arrays) {
    if (arr === undefined || arr === null) continue;
    const key = JSON.stringify(arr);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(arr);
    }
  }

  return unique;
}

/**
 * Wrap a value appropriately for the Arr structure
 */
function wrapValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (isPrimitive(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    // Arrays stay as-is (they're already at the right level)
    return value;
  }

  // Objects - wrap their nested properties
  const result: any = {};
  for (const key in value) {
    const val = value[key];

    if (isPrimitive(val)) {
      result[key] = val;
    } else if (Array.isArray(val)) {
      // Wrap array in another array
      result[key] = [val];
    } else {
      // Wrap object in array
      result[key] = [wrapValue(val)];
    }
  }

  return result;
}

/**
 * Check if a value is a primitive
 */
function isPrimitive(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
