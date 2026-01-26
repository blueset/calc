const { Lexer } = require('./src/lexer.ts');
const { DataLoader } = require('./src/data-loader.ts');
const path = require('path');

async function test() {
  const dataLoader = new DataLoader();
  await dataLoader.load(path.join(__dirname, 'data'));
  
  const lexer = new Lexer('5 km', dataLoader);
  const tokens = lexer.tokenize();
  
  console.log('Tokens for "5 km":');
  tokens.forEach(t => console.log(`  ${t.type}: "${t.value}"`));
}

test().catch(console.error);
