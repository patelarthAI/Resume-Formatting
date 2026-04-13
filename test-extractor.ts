import WordExtractor from "word-extractor";
import fs from "fs";

async function testExtractor() {
  try {
    const extractor = new WordExtractor();
    console.log("Extractor methods:", Object.keys(extractor));
    console.log("Extractor prototype:", Object.keys(Object.getPrototypeOf(extractor)));
  } catch (e) {
    console.error(e);
  }
}

testExtractor();
