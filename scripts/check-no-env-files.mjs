// O OpenNext embute os arquivos .env* no worker (next-env.mjs). Um deploy feito desta
// máquina levaria a chave secreta do Supabase (e o DEMO_MODE) para dentro do script.
// Os valores de produção ficam só nos segredos da Cloudflare.
import { readdirSync } from "node:fs";

const found = readdirSync(".").filter((f) => f.startsWith(".env") && f !== ".env.example");
if (found.length > 0) {
  console.error(
    `Deploy recusado: ${found.join(", ")} seria embutido no worker.\n` +
      "Faça o deploy pelo Git (build na Cloudflare) ou mova esses arquivos para fora da pasta."
  );
  process.exit(1);
}
