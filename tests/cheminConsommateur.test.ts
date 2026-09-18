import { describe, expect, it } from "vitest";
import pkg from "../package.json";

// [CI-IGNORE-SCRIPTS] Ce fichier garde une garantie que la CI vérifiait AUTREFOIS par accident.
//
// Aucun consommateur n'installe ce paquet depuis un registre : les six apps du hub font
// `npm install github:MoKarade/hub-contract#vX.Y.Z`, et une installation depuis git ne livre
// AUCUN `dist/` — c'est le script `prepare` qui le construit chez le consommateur, au moment de
// l'installation. Sans `prepare`, l'app installe un paquet dont `main`, `module` et `types`
// pointent tous vers un dossier qui n'existe pas.
//
// Jusqu'au 18/09/2026, la CI le prouvait sans le dire : son `npm ci` déclenchait le `prepare`,
// donc un `prepare` retiré aurait cassé le run. `npm ci --ignore-scripts` (posé le même jour,
// pour que les scripts d'installation des DÉPENDANCES ne tournent plus sur le runner) supprime
// exactement cette preuve — et npm n'offre aucun moyen d'ignorer les scripts des dépendances
// SANS ignorer le sien. La garantie est donc reprise ici, explicitement.
//
// Ce que ce test NE prouve pas : que npm déclenche bien `prepare` sur une installation depuis
// git. Ça, c'est le comportement de npm, pas celui de ce dépôt — il ne peut pas se régresser
// dans une PR. Ce qui peut se régresser, c'est la DÉCLARATION, et c'est ce qui est gardé.

describe("[CI-IGNORE-SCRIPTS] le chemin d'installation d'un consommateur", () => {
  // Anti-vacuité : sans build déclaré, « prepare construit le paquet » serait vrai d'un dépôt
  // qui ne construit rien. C'est la cible à perturber pour voir ce fichier rougir.
  it("déclare un script `build` non vide", () => {
    expect(pkg.scripts?.build, "package.json n'a plus de script `build`").toBeTruthy();
  });

  it("déclare un `prepare` qui lance ce build — sinon une install depuis git ne produit pas de dist/", () => {
    const prepare = pkg.scripts?.prepare;
    expect(prepare, "package.json n'a plus de script `prepare`").toBeTruthy();
    // On exige qu'il PASSE PAR le script `build` plutôt qu'une commande figée : `tsup` peut être
    // remplacé un jour, le fait que `prepare` construise ne doit pas l'être.
    expect(prepare).toMatch(/\bnpm run build\b/);
  });

  it("fait pointer main/module/types dans dist/ — ce que seul le prepare remplit", () => {
    for (const champ of ["main", "module", "types"] as const) {
      expect(pkg[champ], `package.json.${champ} manquant`).toBeTruthy();
      expect(pkg[champ]).toMatch(/^\.\/dist\//);
    }
  });
});
