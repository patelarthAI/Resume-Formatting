import WordExtractor from "word-extractor";

async function testExtractor() {
  try {
    const extractor = new WordExtractor();
    console.log("extract method:", typeof extractor.extract);
  } catch (e) {
    console.error(e);
  }
}

testExtractor();
