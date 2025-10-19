/*
Created by: Elaine Martzen (Weatherall-96)
*/

import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("reorderNames").then((result) => {
  if (!result) return;

  ("use strict");

  const langChecks = {
    he: /[\u0590-\u05FF]/,
    ru: /[\u0400-\u04FF]/,
    gr: /[\u0370-\u03FF\u1F00-\u1FFF]/,
    ko: /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/,
    zh: /[\u4E00-\u9FFF]/,
    en: /[A-Za-z]/,
  };

  const containsLang = (text, lang) => langChecks[lang].test(text || "");
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const unique = (arr) => [...new Set(arr.filter(Boolean))];
  const isMixed = (s) => containsLang(s, "en") && Object.keys(langChecks).some((l) => l !== "en" && containsLang(s, l));

  const whenReady = (sel, t = 7000) =>
    new Promise((resolve, reject) => {
      const found = document.querySelector(sel);
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const el = document.querySelector(sel);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        reject("timeout");
      }, t);
    });

  whenReady('p.VITALS[data-cy="vitals-name"]').then((vitals) => {
    // build english given name from givenName + additionalName + quoted latin nicknames
    const givenSpans = Array.from(vitals.querySelectorAll('[itemprop="givenName"], [itemprop="additionalName"]')).map(
      (n) => clean(n.textContent)
    );

    const quotedLatinNick = Array.from(vitals.querySelectorAll("strong"))
      .map((n) => clean(n.textContent))
      .filter((t) => /^["'][A-Za-z].*["']$/.test(t)); // "Chaim"

    const given = unique([...givenSpans, ...quotedLatinNick].filter((t) => /^[A-Za-z"']/.test(t))).join(" ");

    const lnab = clean(vitals.querySelector('[itemprop="familyName"]')?.content || "");
    const allText = vitals.textContent || "";
    if (!allText) return;

    const strongs = Array.from(vitals.querySelectorAll("strong"));
    const genealogyLinks = Array.from(vitals.querySelectorAll("a[href*='/genealogy/']"));

    // links partitioned by language, excluding mixed-script labels
    const linksByLang = {};
    Object.keys(langChecks).forEach((lang) => {
      linksByLang[lang] = unique(
        genealogyLinks
          .filter((a) => containsLang(a.textContent, lang) && !isMixed(a.textContent) && a.textContent.trim() !== "")
          .map((a) => a.outerHTML)
      );
    });

    // english line
    const enLinks = linksByLang.en;
    const lnabLink =
      genealogyLinks.find((a) => a.textContent === lnab)?.outerHTML ||
      enLinks.find((a) => a.includes(`>${lnab}<`)) ||
      enLinks[0] ||
      lnab;

    // aka: english-only links not equal to lnab, and not mixed-script
    const akaSurnames = unique(
      genealogyLinks
        .filter(
          (a) =>
            a.outerHTML !== lnabLink &&
            a.textContent !== lnab &&
            /^[A-Za-z]/.test(a.textContent) &&
            !isMixed(a.textContent)
        )
        .map((a) => a.outerHTML)
    );

    const engGiven = given || clean(vitals.querySelector('[itemprop="givenName"]')?.textContent || "");
    const engLine = `${engGiven} ${lnabLink || ""}${akaSurnames.length ? " aka " + akaSurnames.join(", ") : ""}`.trim();

    // local line: show first detected non-english script, with no local aka tail
    let localLine = "";
    for (const lang of ["he", "gr", "ru", "ko", "zh"]) {
      const links = linksByLang[lang];
      if (!links.length && !containsLang(allText, lang)) continue;

      let firstName = "";
      for (const s of strongs) {
        const txt = clean(s.textContent);
        if (containsLang(txt, lang) && !containsLang(txt, "en")) {
          firstName = txt;
          break;
        }
      }

      if (!firstName && containsLang(engGiven, lang)) firstName = engGiven;

      const surnameLink = links[0] || "";
      if (firstName || surnameLink) {
        const dir = lang === "he" ? "rtl" : "ltr";
        localLine = `<span dir="${dir}">${[firstName, surnameLink].filter(Boolean).join(" ")}</span>`;
        break;
      }
    }

    vitals.innerHTML = localLine ? `${engLine}<br>\n${localLine}` : engLine;
  });
});
