import fs from "fs/promises";
import path from "path";

let cachedOrgMap: Record<string, string> | null = null;

export async function getOrganizationMap(): Promise<Record<string, string>> {
  if (cachedOrgMap) {
    return cachedOrgMap;
  }

  try {
    const filePath = path.join(process.cwd(), "config", "org-map.json");

    const fileContent = await fs.readFile(filePath, "utf-8");

    cachedOrgMap = JSON.parse(fileContent);
    return cachedOrgMap!;
  } catch (error) {
    console.error(
      "读取组织映射文件失败, 请检查 config/org-map.json 是否存在:",
      error,
    );

    return {
      计算机学院: "cs",
      数学科学学院: "math",
      地理科学学院: "geo",
      电子信息工程学院: "eie",
      环境科学与工程学院: "env",
      物理与天文学院: "phy",
      壹零智创: "ylzc",
    };
  }
}
