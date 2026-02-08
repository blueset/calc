import { NodeType, NodeSet } from '@lezer/common'
import { styleTags, tags } from '@lezer/highlight'

export const NodeID = {
  Document: 0,
  Variable: 1,
  Constant: 2,
  FunctionCall: 3,
  Unit: 4,
  BooleanLiteral: 5,
  DateTime: 6,
  Heading1: 7,
  Heading2: 8,
  Heading3: 9,
  Heading4: 10,
  Heading5: 11,
  Heading6: 12,
  VariableDefinition: 13,
  Number: 14,
  Operator: 15,
  Keyword: 16,
} as const

const nodeNames = [
  'Document',
  'Variable',
  'Constant',
  'FunctionCall',
  'Unit',
  'BooleanLiteral',
  'DateTime',
  'Heading1',
  'Heading2',
  'Heading3',
  'Heading4',
  'Heading5',
  'Heading6',
  'VariableDefinition',
  'Number',
  'Operator',
  'Keyword',
]

const nodeTypes = nodeNames.map((name, id) =>
  NodeType.define({ id, name, top: id === 0 })
)

export const semanticNodeSet = new NodeSet(nodeTypes).extend(
  styleTags({
    Variable: tags.variableName,
    Constant: tags.constant(tags.variableName),
    FunctionCall: tags.function(tags.variableName),
    Unit: tags.unit,
    BooleanLiteral: tags.bool,
    DateTime: tags.special(tags.string),
    Heading1: tags.heading1,
    Heading2: tags.heading2,
    Heading3: tags.heading3,
    Heading4: tags.heading4,
    Heading5: tags.heading5,
    Heading6: tags.heading6,
    VariableDefinition: tags.definition(tags.variableName),
    Number: tags.number,
    Operator: tags.operator,
    Keyword: tags.keyword,
  })
)
