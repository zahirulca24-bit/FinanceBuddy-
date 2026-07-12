import path from "path";

export const getPortValue = (portStr: string | undefined): number | undefined => {
  if (!portStr) {
    return 3000;
  }
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port <= 0 || port.toString() !== portStr.trim()) {
    return undefined;
  }
  return port;
};

export const validateProdEnvValue = (url: string | undefined, key: string | undefined): boolean => {
  if (!url || !key) {
    return false;
  }
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return false;
    }
  } catch (e) {
    return false;
  }
  return true;
};
