import { useState } from "react";
import { Layout } from "./components/Layout";
import { FlowVisualization } from "./components/FlowVisualization";
import { QueryPanel } from "./components/QueryPanel";
import { EventLog } from "./components/EventLog";
import { SellerCatalog } from "./components/SellerCatalog";
import { EncryptionDemo } from "./components/EncryptionDemo";
import { ApiDocs } from "./components/ApiDocs";
import { useEventStream } from "./hooks/useEventStream";
import { useRegistry } from "./hooks/useRegistry";

export default function App() {
  const { events, latestEvent, isConnected } = useEventStream();
  const { sellers, loading } = useRegistry();
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  return (
    <Layout
      isConnected={isConnected}
      onShowDocs={() => setShowDocs(!showDocs)}
      showingDocs={showDocs}
    >
      {showDocs ? (
        <ApiDocs onBack={() => setShowDocs(false)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column — 2/3 width */}
          <div className="lg:col-span-2 space-y-4">
            {/* Hero flow visualization */}
            <FlowVisualization events={events} latestEvent={latestEvent} />

            {/* Encryption comparison */}
            <EncryptionDemo events={events} />

            {/* Event log */}
            <EventLog events={events} />
          </div>

          {/* Right column — 1/3 width */}
          <div className="space-y-4">
            {/* Seller catalog */}
            <SellerCatalog
              sellers={sellers}
              selectedId={selectedSellerId}
              onSelect={setSelectedSellerId}
              loading={loading}
            />

            {/* Query panel */}
            <QueryPanel
              sellers={sellers}
              selectedSellerId={selectedSellerId}
              onSelectSeller={setSelectedSellerId}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}
