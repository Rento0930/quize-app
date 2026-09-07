const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'src', 'assets', 'data', 'pokemon.json');

const COLOR_JA = {
  black: 'くろ',
  blue: 'あお',
  brown: 'ちゃいろ',
  gray: 'はいいろ',
  green: 'みどり',
  pink: 'ピンク',
  purple: 'むらさき',
  red: 'あか',
  white: 'しろ',
  yellow: 'きいろ',
};

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.json();
}

async function fetchSpeciesInfo(no) {
  const species = await fetchJson(`https://pokeapi.co/api/v2/pokemon-species/${no}`);
  const genusEntry = species.genera.find(g => g.language.name === 'ja');
  return {
    genus: genusEntry ? genusEntry.genus : null,
    color: COLOR_JA[species.color.name] ?? species.color.name,
  };
}

async function fetchBaseFormInfo(no) {
  const pokemon = await fetchJson(`https://pokeapi.co/api/v2/pokemon/${no}`);
  return {
    height: pokemon.height / 10,
    weight: pokemon.weight / 10,
  };
}

async function runInBatches(items, batchSize, worker) {
  const results = new Map();
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(worker));
    batch.forEach((item, index) => results.set(item, batchResults[index]));
    console.log(`progress: ${Math.min(i + batchSize, items.length)}/${items.length}`);
  }
  return results;
}

async function main() {
  const pokemonList = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

  const uniqueNos = [...new Set(pokemonList.map(p => p.no))];
  const baseFormNos = [...new Set(
    pokemonList.filter(p => !p.isMegaEvolution).map(p => p.no)
  )];

  console.log(`species info: ${uniqueNos.length} 件を取得します`);
  const speciesInfoByNo = await runInBatches(uniqueNos, 10, fetchSpeciesInfo);

  console.log(`base form info: ${baseFormNos.length} 件を取得します`);
  const baseFormInfoByNo = await runInBatches(baseFormNos, 10, fetchBaseFormInfo);

  const enriched = pokemonList.map(p => {
    const speciesInfo = speciesInfoByNo.get(p.no);
    const baseFormInfo = p.isMegaEvolution ? null : baseFormInfoByNo.get(p.no);
    return {
      ...p,
      genus: speciesInfo?.genus ?? null,
      color: speciesInfo?.color ?? null,
      height: baseFormInfo?.height ?? null,
      weight: baseFormInfo?.weight ?? null,
    };
  });

  fs.writeFileSync(DATA_PATH, JSON.stringify(enriched, null, 2) + '\n', 'utf-8');
  console.log(`完了: ${DATA_PATH} を更新しました`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
