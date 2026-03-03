export async function safeFetch(url: string, options: RequestInit = {}, retryCount = 0): Promise<any> {
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      if (response.ok) {
        return data;
      } else {
        throw new Error(data.error || text);
      }
    } catch (e) {
      if (text.includes("Rate exceeded") && retryCount < 3) {
        console.warn(`Rate limit exceeded for ${url}. Retrying in 2 seconds... (Attempt ${retryCount + 1})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return safeFetch(url, options, retryCount + 1);
      }
      throw new Error(text || "Invalid JSON response");
    }
  } catch (error) {
    throw error;
  }
}
