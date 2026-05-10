import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownReportProps = {
  content: string;
  error?: boolean;
};

export function MarkdownReport({
  content,
  error = false,
}: MarkdownReportProps) {
  return (
    <div className={`markdown-report ${error ? "markdown-report-error" : ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, ...props }) => {
            const isAnchorLink = href?.startsWith("#");

            return (
              <a
                {...props}
                href={href}
                rel={isAnchorLink ? undefined : "noreferrer"}
                target={isAnchorLink ? undefined : "_blank"}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
