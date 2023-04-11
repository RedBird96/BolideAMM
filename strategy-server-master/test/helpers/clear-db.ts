import type { Connection } from 'typeorm';

export const clearDB = async (connection: Connection): Promise<void> => {
  const entities = connection.entityMetadatas;

  try {
    for (const entity of entities.sort((a: any, b: any) => b.order - a.order)) {
      const repository = await connection.getRepository(entity.name);
      const deleteQuery = `DELETE FROM "${entity.tableName}";`;
      const truncateQuery = `TRUNCATE "${entity.tableName}" RESTART IDENTITY;`;

      await repository.query(deleteQuery);
      await repository.query(truncateQuery);
    }
  } catch (error) {
    throw new Error(`ERROR: Cleaning test db: ${error}`);
  }
};
