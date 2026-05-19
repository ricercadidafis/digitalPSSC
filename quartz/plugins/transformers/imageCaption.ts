import { QuartzTransformerPlugin } from "../types"
import { visit } from "unist-util-visit"
import type { Root, Element, Parent, Text } from "hast"

interface Options {
  className?: string
  captionClassName?: string
}

function isElement(node: unknown): node is Element {
  return Boolean(node && typeof node === "object" && "type" in node && (node as Element).type === "element")
}

function textNode(value: string): Text {
  return { type: "text", value }
}

function getImgCaption(img: Element): string | undefined {
  const props = img.properties ?? {}

  const title = props.title
  if (typeof title === "string" && title.trim() !== "") {
    return title.trim()
  }

  const alt = props.alt
  if (typeof alt === "string" && alt.trim() !== "") {
    return alt.trim()
  }

  return undefined
}

export const ImageCaption: QuartzTransformerPlugin<Options> = (opts) => {
  const figureClass = opts?.className ?? "image-caption"
  const figcaptionClass = opts?.captionClassName ?? "image-caption-text"

  return {
    name: "ImageCaption",

    htmlPlugins() {
      return [
        () => {
          return (tree: Root) => {
            visit(tree, "element", (node: Element, index, parent: Parent | undefined) => {
              if (!parent || typeof index !== "number") return

              // Case 1: <p><img ... /></p>
              if (node.tagName === "p") {
                const imageChildren = node.children.filter(
                  (child) => isElement(child) && child.tagName === "img",
                ) as Element[]

                const nonWhitespaceChildren = node.children.filter((child) => {
                  return !(child.type === "text" && child.value.trim() === "")
                })

                if (imageChildren.length === 1 && nonWhitespaceChildren.length === 1) {
                  const img = imageChildren[0]
                  const caption = getImgCaption(img)
                  if (!caption) return

                  parent.children[index] = {
                    type: "element",
                    tagName: "figure",
                    properties: { className: [figureClass] },
                    children: [
                      img,
                      {
                        type: "element",
                        tagName: "figcaption",
                        properties: { className: [figcaptionClass] },
                        children: [textNode(caption)],
                      },
                    ],
                  }

                  return
                }
              }

              // Case 2: bare <img ... />
              if (node.tagName === "img") {
                const caption = getImgCaption(node)
                if (!caption) return

                parent.children[index] = {
                  type: "element",
                  tagName: "figure",
                  properties: { className: [figureClass] },
                  children: [
                    node,
                    {
                      type: "element",
                      tagName: "figcaption",
                      properties: { className: [figcaptionClass] },
                      children: [textNode(caption)],
                    },
                  ],
                }
              }
            })
          }
        },
      ]
    },
  }
}