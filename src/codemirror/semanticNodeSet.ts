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
  Heading: 7,
  VariableDefinition: 8,
  Number: 9,
  Operator: 10,
  Keyword: 11,
} as const

const nodeNames = [
  'Document',
  'Variable',
  'Constant',
  'FunctionCall',
  'Unit',
  'BooleanLiteral',
  'DateTime',
  'Heading',
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
    Heading: tags.heading,
    VariableDefinition: tags.definition(tags.variableName),
    Number: tags.number,
    Operator: tags.operator,
    Keyword: tags.keyword,
  })
)
