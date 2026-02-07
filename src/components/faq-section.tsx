"use client";

import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
  icon: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Šta je VrebajPopust?",
    answer:
      "VrebajPopust je sajt koji prati cene u najvećim sportskim prodavnicama u Srbiji i prikazuje samo proizvode sa popustom preko 50%. Pomažemo vam da pronađete najbolje ponude bez pretrage više sajtova.",
    icon: "🎯",
  },
  {
    question: "Koje prodavnice pratite?",
    answer:
      "Pratimo 8 najvećih sportskih prodavnica: Djak Sport, Planeta Sport, Sport Vision, N Sport, Buzz Sneakers, Office Shoes, Intersport i Tref Sport. Svi proizvodi se ažuriraju svakodnevno.",
    icon: "🏪",
  },
  {
    question: "Kako da kupim proizvod?",
    answer:
      "Kada pronađete proizvod koji vam se sviđa, kliknite na dugme \"Kupi\" i bićete preusmereni direktno na sajt prodavnice gde možete završiti kupovinu po prikazanoj ceni.",
    icon: "🛒",
  },
  {
    question: "Da li su cene pouzdane?",
    answer:
      "Da, cene se automatski ažuriraju svakodnevno direktno sa sajtova prodavnica. Prikazujemo originalnu cenu, cenu na popustu i procenat uštede.",
    icon: "✓",
  },
  {
    question: "Mogu li sačuvati omiljene ponude?",
    answer:
      "Da, kliknite na ikonu srca na bilo kom proizvodu da ga dodate u omiljene. Vaše liste se čuvaju lokalno u pretraživaču i možete im pristupiti bilo kada.",
    icon: "❤️",
  },
  {
    question: "Zašto samo popusti preko 50%?",
    answer:
      "Fokusiramo se na najveće uštede. Umesto da prikazujemo hiljade proizvoda sa malim popustima, biramo samo one gde stvarno možete značajno uštedeti - minimum duplo jeftinije od originalne cene.",
    icon: "💰",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-4xl px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Česta pitanja
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Sve što treba da znate o VrebajPopust
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all duration-300 ${
                  isOpen
                    ? "border-red-200 dark:border-red-800 shadow-lg"
                    : "border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600"
                }`}
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="flex w-full items-center gap-4 p-5 text-left cursor-pointer"
                >
                  {/* Icon */}
                  <span className={`text-2xl flex-shrink-0 transition-transform duration-300 ${isOpen ? "scale-110" : ""}`}>
                    {item.icon}
                  </span>

                  {/* Question */}
                  <span className={`flex-1 text-lg font-medium transition-colors ${
                    isOpen ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
                  }`}>
                    {item.question}
                  </span>

                  {/* Arrow */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isOpen
                      ? "bg-red-100 dark:bg-red-900/30 rotate-180"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}>
                    <svg
                      className={`w-4 h-4 transition-colors ${
                        isOpen ? "text-red-600 dark:text-red-400" : "text-gray-500"
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
                  </div>
                </button>

                {/* Answer */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? "max-h-96" : "max-h-0"
                  }`}
                >
                  <div className="px-5 pb-5 pl-16">
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
