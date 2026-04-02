async function testLogic() {
  const models = ["modelA", "modelB"];
  const pool = ["key1", "key2", "key3"];
  let currentKeyIndex = 0;
  let totalAttempts = 0;
  const maxAttempts = 3;

  for (const modelId of models) {
    for (let i = 0; i < pool.length; i++) {
      if (totalAttempts >= maxAttempts) break;

      const apiKey = pool[currentKeyIndex % pool.length];
      console.log(`Trying model ${modelId} with key ${apiKey}`);
      
      // Simulate 429 Rate Limit
      console.log(`-> Hit 429 Rate Limit`);
      currentKeyIndex++;
      totalAttempts++;
      continue;
    }
    if (totalAttempts >= maxAttempts) break;
  }
}

testLogic();
