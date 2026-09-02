//! Local, on-device safety screening. Pure functions over the text the user just
//! typed: no model, no network, nothing persisted. Heuristic and conservative — it
//! errs toward offering help; it is never a diagnosis (NFR14–NFR16).

use crate::domain::{Resource, ScreenResult};

/// Strong crisis phrases (FR + EN). Kept specific to avoid firing on ordinary
/// sadness, while erring toward help: a false positive is acceptable, a miss is not.
const DISTRESS: &[&str] = &[
    // French
    "envie de mourir",
    "envie d'en finir",
    "en finir avec la vie",
    "mettre fin à mes jours",
    "me suicider",
    "me tuer",
    "suicide",
    "plus envie de vivre",
    "plus la force de vivre",
    "à quoi bon vivre",
    "me faire du mal",
    "disparaître pour toujours",
    "personne ne me regretterait",
    // English
    "want to die",
    "kill myself",
    "end my life",
    "end it all",
    "hurt myself",
    "no reason to live",
    "better off dead",
    "suicidal",
];

/// High-stakes keywords by category (money / health / legal). Non-blocking nudge.
const HIGH_STAKES: &[(&str, &[&str])] = &[
    (
        "argent",
        &[
            "hypothèque",
            "emprunt",
            "faire faillite",
            "toutes mes économies",
            "tout mon argent",
            "crédit immobilier",
            "endetter",
        ],
    ),
    (
        "santé",
        &[
            "cancer",
            "opération",
            "chirurgie",
            "arrêter mon traitement",
            "maladie grave",
            "chimio",
            "diagnostic",
        ],
    ),
    (
        "juridique",
        &[
            "divorce",
            "avocat",
            "procès",
            "tribunal",
            "garde des enfants",
            "héritage",
            "porter plainte",
        ],
    ),
];

/// French-first crisis resources, plus the international directory. All offline.
pub fn resources() -> Vec<Resource> {
    vec![
        Resource {
            name: "3114 — Prévention du suicide".into(),
            contact: "3114".into(),
            note: "Ligne nationale, gratuite, 24h/24 et 7j/7.".into(),
        },
        Resource {
            name: "SOS Amitié".into(),
            contact: "09 72 39 40 50".into(),
            note: "Écoute anonyme, 24h/24.".into(),
        },
        Resource {
            name: "Urgences".into(),
            contact: "112 (ou 15)".into(),
            note: "En cas de danger immédiat.".into(),
        },
        Resource {
            name: "Find A Helpline".into(),
            contact: "findahelpline.com".into(),
            note: "Lignes d'écoute vérifiées, par pays.".into(),
        },
    ]
}

fn high_stakes(lower: &str) -> Option<String> {
    for (category, words) in HIGH_STAKES {
        if words.iter().any(|w| lower.contains(w)) {
            return Some((*category).to_string());
        }
    }
    None
}

/// Screen text locally. Distress takes precedence; when detected, resources are
/// attached and the caller must leave the coaching flow (and never run AI on it).
pub fn screen(text: &str) -> ScreenResult {
    let lower = text.to_lowercase();
    let distress = DISTRESS.iter().any(|p| lower.contains(p));
    ScreenResult {
        distress,
        high_stakes: if distress { None } else { high_stakes(&lower) },
        resources: if distress { resources() } else { vec![] },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_crisis_and_attaches_resources() {
        let r = screen("je n'ai plus envie de vivre, tout est noir");
        assert!(r.distress);
        assert!(!r.resources.is_empty());
        assert!(r.resources.iter().any(|x| x.contact == "3114"));
    }

    #[test]
    fn does_not_overfire_on_ordinary_sadness() {
        let r = screen("je suis un peu triste aujourd'hui et fatigué");
        assert!(!r.distress);
        assert!(r.resources.is_empty());
    }

    #[test]
    fn flags_high_stakes_without_distress() {
        let r = screen("dois-je arrêter mon traitement contre le cancer ?");
        assert!(!r.distress);
        assert_eq!(r.high_stakes.as_deref(), Some("santé"));
    }
}
