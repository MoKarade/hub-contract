import { describe, expect, it } from "vitest";
import {
  CONTRACT_VERSION,
  ContractTooNewError,
  HubAssistantActionSchema,
  validateActionCatalog,
  type HubActionCatalog,
} from "../src/index";

const lecture = {
  id: "lire-solde",
  label: "Lire le solde",
  level: "N0",
  preview: false,
  undoable: false,
  input: [],
};

const reversible = {
  id: "cocher-article",
  label: "Cocher un article",
  description: "Marque un article de la liste d'épicerie comme acheté.",
  level: "N1",
  preview: false,
  undoable: true,
  input: [{ name: "articleId", label: "Article", type: "text", required: true }],
};

const sensible = {
  id: "creer-batch",
  label: "Créer un batch",
  level: "N2",
  preview: true,
  undoable: false,
  input: [
    { name: "recetteId", label: "Recette", type: "text", required: true },
    { name: "portions", label: "Portions", type: "number", required: false },
    { name: "jour", label: "Jour", type: "date", required: false },
    { name: "congeler", label: "Congeler", type: "boolean", required: false },
  ],
};

const physique = {
  id: "ouvrir-borne",
  label: "Ouvrir la borne",
  level: "N3",
  preview: false,
  undoable: false,
  input: [],
};

function catalogue(actions: unknown[]): unknown {
  return { contractVersion: CONTRACT_VERSION, app: { id: "batchchef" }, actions };
}

describe("Catalogue d'actions de l'assistant", () => {
  it("rend à l'identique un catalogue valide des quatre niveaux", () => {
    const entree = catalogue([lecture, reversible, sensible, physique]);
    const rendu = validateActionCatalog(entree);
    expect(rendu).toEqual(entree);
  });

  it("un catalogue vide est valide : l'app n'expose aucune action", () => {
    const rendu: HubActionCatalog = validateActionCatalog(catalogue([]));
    expect(rendu.actions).toEqual([]);
  });

  it("strippe les clés inconnues au lieu de les rendre", () => {
    const rendu = validateActionCatalog({
      ...(catalogue([{ ...lecture, secret: "x" }]) as object),
      extra: 1,
    });
    expect(rendu).toEqual(catalogue([lecture]));
  });

  it("le schéma d'une action isolée valide et rend la même chose", () => {
    expect(HubAssistantActionSchema.parse(reversible)).toEqual(reversible);
  });

  describe("le niveau contraint ce que l'action peut déclarer", () => {
    it("N0 : un aperçu est refusé", () => {
      expect(() => validateActionCatalog(catalogue([{ ...lecture, preview: true }]))).toThrow(
        /N0\) n'a rien à prévisualiser/,
      );
    });

    it("N0 : annulable est refusé", () => {
      expect(() => validateActionCatalog(catalogue([{ ...lecture, undoable: true }]))).toThrow(
        /N0\) n'a rien à annuler/,
      );
    });

    it("N1 : non annulable est refusé", () => {
      expect(() => validateActionCatalog(catalogue([{ ...reversible, undoable: false }]))).toThrow(
        /N1 doit pouvoir être annulée/,
      );
    });

    it("N1 : l'aperçu reste libre", () => {
      const avecApercu = { ...reversible, preview: true };
      expect(validateActionCatalog(catalogue([avecApercu])).actions[0]).toEqual(avecApercu);
    });

    it("N2 : sans aperçu est refusé", () => {
      expect(() => validateActionCatalog(catalogue([{ ...sensible, preview: false }]))).toThrow(
        /N2 doit offrir un aperçu/,
      );
    });

    it("N2 : annulable reste libre", () => {
      const annulable = { ...sensible, undoable: true };
      expect(validateActionCatalog(catalogue([annulable])).actions[0]).toEqual(annulable);
    });

    it("N3 : annulable est refusé", () => {
      expect(() => validateActionCatalog(catalogue([{ ...physique, undoable: true }]))).toThrow(
        /N3 est irréversible/,
      );
    });

    it("N3 : l'aperçu reste libre", () => {
      const avecApercu = { ...physique, preview: true };
      expect(validateActionCatalog(catalogue([avecApercu])).actions[0]).toEqual(avecApercu);
    });

    it("un niveau inconnu est refusé", () => {
      expect(() => validateActionCatalog(catalogue([{ ...lecture, level: "N4" }]))).toThrow(
        /actions\.0\.level/,
      );
    });
  });

  describe("champs d'une action", () => {
    it("preview et undoable sont obligatoires, sans défaut", () => {
      const { preview: _p, ...sansApercu } = reversible;
      const { undoable: _u, ...sansAnnulation } = reversible;
      expect(() => validateActionCatalog(catalogue([sansApercu]))).toThrow(/preview/);
      expect(() => validateActionCatalog(catalogue([sansAnnulation]))).toThrow(/undoable/);
    });

    it("input est obligatoire : un tableau vide dit « aucun », l'absence est refusée", () => {
      const { input: _i, ...sansEntree } = lecture;
      expect(() => validateActionCatalog(catalogue([sansEntree]))).toThrow(/input/);
    });

    it("refuse un identifiant hors kebab-case", () => {
      for (const id of ["Lire_Solde", "lire solde", "-lire", "lire-", "lire--solde", ""]) {
        expect(() => validateActionCatalog(catalogue([{ ...lecture, id }]))).toThrow(/actions\.0\.id/);
      }
    });

    it("refuse un libellé vide ou de plus de 40 caractères", () => {
      expect(() => validateActionCatalog(catalogue([{ ...lecture, label: "" }]))).toThrow(/label/);
      expect(() => validateActionCatalog(catalogue([{ ...lecture, label: "x".repeat(41) }]))).toThrow(
        /label/,
      );
    });

    it("refuse une description de plus de 140 caractères", () => {
      expect(() =>
        validateActionCatalog(catalogue([{ ...lecture, description: "x".repeat(141) }])),
      ).toThrow(/description/);
    });

    it("refuse plus de 8 paramètres", () => {
      const champs = Array.from({ length: 9 }, (_, i) => ({
        name: `p${i}`,
        label: `P${i}`,
        type: "text",
        required: false,
      }));
      expect(() => validateActionCatalog(catalogue([{ ...lecture, input: champs }]))).toThrow(/input/);
    });

    it("refuse un paramètre mal nommé, de type inconnu ou sans required", () => {
      const champ = { name: "articleId", label: "Article", type: "text", required: true };
      for (const mauvais of [
        { ...champ, name: "ArticleId" },
        { ...champ, name: "article-id" },
        { ...champ, type: "file" },
        { ...champ, required: undefined },
      ]) {
        expect(() =>
          validateActionCatalog(catalogue([{ ...reversible, input: [mauvais] }])),
        ).toThrow(/input\.0/);
      }
    });

    it("refuse deux paramètres de même nom dans une action", () => {
      const champ = { name: "jour", label: "Jour", type: "date", required: false };
      expect(() =>
        validateActionCatalog(catalogue([{ ...reversible, input: [champ, champ] }])),
      ).toThrow(/même nom/);
    });
  });

  describe("catalogue", () => {
    it("refuse deux actions de même identifiant", () => {
      expect(() => validateActionCatalog(catalogue([lecture, lecture]))).toThrow(
        /même identifiant/,
      );
    });

    it("refuse plus de 50 actions", () => {
      const beaucoup = Array.from({ length: 51 }, (_, i) => ({ ...lecture, id: `lire-${i}` }));
      expect(() => validateActionCatalog(catalogue(beaucoup))).toThrow(/actions/);
    });

    it("refuse un identifiant d'app hors kebab-case", () => {
      expect(() =>
        validateActionCatalog({ contractVersion: 1, app: { id: "Batch Chef" }, actions: [] }),
      ).toThrow(/app\.id/);
    });

    it("liste toutes les issues, avec leur chemin", () => {
      const mauvais = [
        { ...lecture, preview: true },
        { ...reversible, undoable: false },
      ];
      expect(() => validateActionCatalog(catalogue(mauvais))).toThrow(
        /HubActionCatalog invalide \(2 issues\).*actions\.0\.preview.*actions\.1\.undoable/,
      );
    });

    it("une seule issue s'écrit au singulier", () => {
      expect(() => validateActionCatalog({ contractVersion: 1, app: { id: "x" } })).toThrow(
        /HubActionCatalog invalide \(1 issue\) — actions/,
      );
    });

    it("un payload qui n'est pas un objet est refusé", () => {
      expect(() => validateActionCatalog(null)).toThrow(/HubActionCatalog invalide/);
    });
  });

  describe("version", () => {
    it("un catalogue plus récent que ce build lève ContractTooNewError, pas « invalide »", () => {
      const futur = { contractVersion: CONTRACT_VERSION + 1, actions: "autre forme" };
      expect(() => validateActionCatalog(futur)).toThrow(ContractTooNewError);
    });

    it("contractVersion 0 est refusé", () => {
      expect(() => validateActionCatalog({ ...(catalogue([]) as object), contractVersion: 0 })).toThrow(
        /contractVersion/,
      );
    });
  });
});
