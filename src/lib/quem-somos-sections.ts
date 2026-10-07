import { repairPriceRows } from "@/lib/repair-prices"

const FAQ_MAIN_COUNT = 4
const FAQ_MORE_COUNT = 8

type FaqArticle = { title: string; slug: string; excerpt: string | null }
type CurriculumCourse = { id: string; title: string; description: string | null; lessons: string[] }

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function replaceBetween(html: string, start: string, end: string, replacement: string, includeEnd = false) {
  const startIndex = html.indexOf(start)
  if (startIndex < 0) return html
  const endIndex = html.indexOf(end, startIndex + start.length)
  if (endIndex < 0) return html
  return html.slice(0, startIndex) + replacement + html.slice(includeEnd ? endIndex + end.length : endIndex)
}

export function buildFaqSections(articles: FaqArticle[]) {
  const withAnswer = articles.filter((article) => article.excerpt?.trim())
  const main = withAnswer.slice(0, FAQ_MAIN_COUNT)
  const more = withAnswer.slice(FAQ_MAIN_COUNT, FAQ_MAIN_COUNT + FAQ_MORE_COUNT)

  const mainGrid = `<div class="objection-main-grid">${main
    .map(
      (article) => `
                    <article class="objection-main-card reveal">
                        <span>DÚVIDA FREQUENTE</span>
                        <h3>${escapeHtml(article.title)}</h3>
                        <p>${escapeHtml(article.excerpt ?? "")}</p>
                    </article>`
    )
    .join("")}
                </div>
                `

  const accordion = `<div class="faq__list">${more
    .map(
      (article, index) => `
                        <article class="faq-item${index === 0 ? " is-open" : ""}">
                            <button aria-expanded="${index === 0}" type="button"><span>${escapeHtml(article.title)}</span><i>+</i></button>
                            <div class="faq-answer">
                                <p>${escapeHtml(article.excerpt ?? "")}</p>
                            </div>
                        </article>`
    )
    .join("")}
                    </div>
                    <style>#mgu-lp .objection-more .faq-item.is-open .faq-answer{max-height:480px !important}</style>
                </div>
                `

  return { mainGrid, accordion, hasContent: main.length > 0 }
}

export function buildCurriculumModules(courses: CurriculumCourse[]) {
  return `<div class="curriculum-modules curriculum-modules--full">${courses
    .map((course, index) => {
      const count = course.lessons.length
      const summary = `${count} ${count === 1 ? "aula" : "aulas"}${course.description ? ` • ${escapeHtml(course.description)}` : ""}`
      const isOpen = index === 0

      return `
                        <article class="curriculum-module curriculum-module--full reveal${isOpen ? " is-open" : ""}" data-curriculum-item="">
                            <button aria-expanded="${isOpen}" class="curriculum-module__button" type="button">
                                <span class="curriculum-module__number">${String(index + 1).padStart(2, "0")}</span>
                                <span><span class="curriculum-module__title">${escapeHtml(course.title)}</span><span class="curriculum-module__category">${summary}</span></span>
                                <span class="curriculum-module__toggle">+</span>
                            </button>
                            <div class="curriculum-module__body">
                                <div class="curriculum-module__inside curriculum-module__inside--full">
                                    <ul class="lesson-grid">${course.lessons.map((lesson) => `<li>${escapeHtml(lesson)}</li>`).join("")}</ul>
                                </div>
                            </div>
                        </article>`
    })
    .join("")}
                </div>
                </div>
                `
}

export function buildRepairTable() {
  return `<table class="repair-table">
                            <thead>
                                <tr>
                                    <th style="width:56%">Serviço</th>
                                    <th style="width:44%">Valor cobrado pelo reparo</th>
                                </tr>
                            </thead>
                            <tbody>${repairPriceRows
                              .map(
                                (row) => `
                                <tr>
                                    <td>${escapeHtml(row.service)}</td>
                                    <td><strong style="font-size:1.3em">${escapeHtml(row.value)}</strong></td>
                                </tr>`
                              )
                              .join("")}
                            </tbody>
                        </table>`
}
