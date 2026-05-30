import { createPiHostBinding } from "../../../src/host-bindings/pi.js";

export default async function cyralisPiExtension(pi: unknown) {
  const binding = createPiHostBinding({ pi });
  await binding.install();
}

