import { Electroview } from "electrobun/view";
import { StrictMode, FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { DatabaseStatus, NoteRPC, Page } from "../shared/contracts";

const rpc = Electroview.defineRPC<NoteRPC>({
  handlers: {
    requests: {},
    messages: {},
  },
});

new Electroview({ rpc });

const api = rpc.requestProxy;

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: DatabaseStatus }
  | { status: "error"; message: string };

function App() {
  const [databaseStatus, setDatabaseStatus] = useState<LoadState>({
    status: "loading",
  });
  const [title, setTitle] = useState("");
  const [lastCreatedPage, setLastCreatedPage] = useState<Page | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function refreshDatabaseStatus() {
    try {
      const data = await api.getDatabaseStatus();
      setDatabaseStatus({ status: "ready", data });
    } catch (error) {
      setDatabaseStatus({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleCreatePage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    setIsCreating(true);

    try {
      const page = await api.createPage({
        title,
        parentPageId: null,
      });
      setLastCreatedPage(page);
      setTitle("");
      await refreshDatabaseStatus();
    } finally {
      setIsCreating(false);
    }
  }

  useEffect(() => {
    void refreshDatabaseStatus();
  }, []);

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Electrobun + Bun SQLite</p>
            <h1>Note</h1>
          </div>
          <button type="button" onClick={() => void refreshDatabaseStatus()}>
            새로고침
          </button>
        </header>

        <section className="panel">
          <h2>SQLite 상태</h2>
          {databaseStatus.status === "loading" ? (
            <p className="muted">데이터베이스를 여는 중입니다.</p>
          ) : null}
          {databaseStatus.status === "error" ? (
            <p className="error">{databaseStatus.message}</p>
          ) : null}
          {databaseStatus.status === "ready" ? (
            <dl className="status-grid">
              <div>
                <dt>SQLite</dt>
                <dd>{databaseStatus.data.sqliteVersion}</dd>
              </div>
              <div>
                <dt>Pages</dt>
                <dd>{databaseStatus.data.pagesCount}</dd>
              </div>
              <div>
                <dt>Blocks</dt>
                <dd>{databaseStatus.data.blocksCount}</dd>
              </div>
              <div>
                <dt>Path</dt>
                <dd className="path">{databaseStatus.data.databasePath}</dd>
              </div>
            </dl>
          ) : null}
        </section>

        <section className="panel">
          <h2>페이지 생성</h2>
          <form className="create-form" onSubmit={handleCreatePage}>
            <input
              aria-label="페이지 제목"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="페이지 제목"
              value={title}
            />
            <button disabled={isCreating || !title.trim()} type="submit">
              {isCreating ? "생성 중" : "생성"}
            </button>
          </form>

          {lastCreatedPage ? (
            <div className="created-page">
              <p>최근 생성</p>
              <strong>{lastCreatedPage.title}</strong>
              <code>{lastCreatedPage.id}</code>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
