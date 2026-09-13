import { EmbedChunks } from "@/services/embedding.service";
import { RepositoryIngestion } from "@/services/repository-ingestion.service";

const RepositoryIngestionService = new RepositoryIngestion();
const EmbedChunksService = new EmbedChunks();

export { RepositoryIngestionService, EmbedChunksService };
