"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Šta je VrebajPopust?",
    answer:
      "VrebajPopust je sajt koji prati cene u najvećim sportskim prodavnicama u Srbiji i prikazuje samo proizvode sa popustom preko 50%. Pomažemo vam da pronađete najbolje ponude bez pretrage više sajtova.",
  },
  {
    question: "Koje prodavnice pratite?",
    answer:
      "Pratimo 6 najvećih sportskih prodavnica: Djak Sport, Planeta Sport, Sport Vision, N Sport, Buzz Sneakers i Office Shoes. Svi proizvodi se ažuriraju svakodnevno.",
  },
  {
    question: "Kako da kupim proizvod?",
    answer:
      "Kada pronađete proizvod koji vam se sviđa, kliknite na dugme \"Kupi\" i bićete preusmereni direktno na sajt prodavnice gde možete završiti kupovinu po prikazanoj ceni.",
  },
  {
    question: "Da li su cene pouzdane?",
    answer:
      "Da, cene se automatski ažuriraju svakodnevno direktno sa sajtova prodavnica. Prikazujemo originalnu cenu, cenu na popustu i procenat uštede.",
  },
  {
    question: "Mogu li sačuvati omiljene ponude?",
    answer:
      "Da, kliknite na ikonu srca na bilo kom proizvodu da ga dodate u omiljene. Vaše liste se čuvaju lokalno u pretraživaču i možete im pristupiti bilo kada.",
  },
  {
    question: "Zašto samo popusti preko 50%?",
    answer:
      "Fokusiramo se na najveće uštede. Umesto da prikazujemo hiljade proizvoda sa malim popustima, biramo samo one gde stvarno možete značajno uštedeti - minimum duplo jeftinije od originalne cene.",
  },
];

export function FAQSection() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <section className="py-16 bg-gray-50 dark:bg-gray-800">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Česta pitanja
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 items-start">
          {FAQ_ITEMS.map((item, index) => (
            <div key={index} className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
              <button
                onClick={() => toggleItem(index)}
                className="flex w-full items-center justify-between text-left cursor-pointer"
              >
                <span className="text-lg font-medium text-gray-900 dark:text-white">
                  {item.question}
                </span>
                <svg
                  className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                    openItems.has(index) ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  openItems.has(index) ? "max-h-96 pt-4" : "max-h-0"
                }`}
              >
                <p className="text-gray-600 dark:text-gray-400">{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
