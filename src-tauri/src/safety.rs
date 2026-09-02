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
    "envie de disparaître",
    "fatigué de vivre",
    "fatiguée de vivre",
    "ne plus vouloir vivre",
    "mieux vaut que je parte",
    "en finir avec tout",
    // English
    "ending my life",
    "ending it all",
    "take my own life",
    "want to die",
    "kill myself",
    "end my life",
    "end it all",
    "hurt myself",
    "no reason to live",
    "no point in living",
    "no point in going on",
    "can't go on",
    "cannot go on",
    "better off dead",
    "better off without me",
    "tired of living",
    "want to disappear",
    "suicidal",
];

/// High-stakes keywords by category (money / health / legal), FR + EN.
/// Non-blocking nudge; the category key is not user-facing today.
const HIGH_STAKES: &[(&str, &[&str])] = &[
    (
        "money",
        &[
            "hypothèque",
            "mortgage",
            "emprunt",
            "faire faillite",
            "go bankrupt",
            "toutes mes économies",
            "all my savings",
            "tout mon argent",
            "all my money",
            "crédit immobilier",
            "endetter",
            "go into debt",
        ],
    ),
    (
        "health",
        &[
            "cancer",
            "opération",
            "surgery",
            "chirurgie",
            "arrêter mon traitement",
            "stop my treatment",
            "maladie grave",
            "serious illness",
            "chimio",
            "chemo",
            "diagnostic",
        ],
    ),
    (
        "legal",
        &[
            "divorce",
            "avocat",
            "lawyer",
            "procès",
            "lawsuit",
            "tribunal",
            "court",
            "garde des enfants",
            "child custody",
            "héritage",
            "inheritance",
            "porter plainte",
            "press charges",
        ],
    ),
];

/// Crisis resources: the French national lines for the app's home country, plus
/// the international directory. All offline.
pub fn resources() -> Vec<Resource> {
    vec![
        Resource {
            name: "3114 — Suicide prevention (France)".into(),
            contact: "3114".into(),
            note: "National line, free, 24/7.".into(),
        },
        Resource {
            name: "SOS Amitié".into(),
            contact: "09 72 39 40 50".into(),
            note: "Anonymous listening, 24/7.".into(),
        },
        Resource {
            name: "Find A Helpline".into(),
            contact: "findahelpline.com".into(),
            note: "Verified helplines, country by country.".into(),
        },
        Resource {
            name: "Emergencies".into(),
            contact: "112 (or 15)".into(),
            note: "If danger is immediate.".into(),
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
    // Lowercase + fold typographic apostrophes so "can't" and "can’t" both match.
    let lower: String = text
        .to_lowercase()
        .chars()
        .map(|c| if c == '\u{2019}' { '\'' } else { c })
        .collect();
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
    fn detects_crisis_in_english() {
        let r = screen("some days I think about ending my life");
        assert!(r.distress);
        assert!(!r.resources.is_empty());
    }

    #[test]
    fn detects_common_miss_variants() {
        assert!(screen("I can't go on like this. I keep thinking about ending it all.").distress);
        assert!(screen("there is no point in going on").distress);
        assert!(screen("je veux en finir avec tout").distress);
    }

    #[test]
    fn folds_typographic_apostrophes() {
        assert!(screen("I can\u{2019}t go on anymore").distress);
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
        assert_eq!(r.high_stakes.as_deref(), Some("health"));

        let r = screen("should I take out a mortgage and move?");
        assert!(!r.distress);
        assert_eq!(r.high_stakes.as_deref(), Some("money"));
    }
}
