import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, X, Users, TrendingUp, CheckCircle2, Clock, FileCheck } from "lucide-react";

interface ResourceData {
  name: string;
  role: "Product Owner" | "Business Analyst";
  initials: string;
  analyse: number;
  approved: number;
  implement: number;
  closed: number;
}

interface POBAWidgetProps {
  quarter?: string;
  resources?: ResourceData[];
  defaultSelectedCount?: number;
  onSelectionChange?: (selected: string[]) => void;
}

const SAMPLE_RESOURCES: ResourceData[] = [
  { name: "Sulaiman Alessa", role: "Product Owner", initials: "SA", analyse: 1, approved: 0, implement: 1, closed: 2 },
  { name: "Maali Alanazi", role: "Business Analyst", initials: "MA", analyse: 2, approved: 2, implement: 1, closed: 3 },
  { name: "Alaa Ali", role: "Product Owner", initials: "AA", analyse: 1, approved: 1, implement: 2, closed: 0 },
  { name: "Khaled Alghithy", role: "Business Analyst", initials: "KA", analyse: 1, approved: 1, implement: 5, closed: 2 },
  { name: "Nora Alshahrani", role: "Business Analyst", initials: "NA", analyse: 3, approved: 2, implement: 1, closed: 4 },
  { name: "Fahad Almutairi", role: "Product Owner", initials: "FA", analyse: 2, approved: 3, implement: 2, closed: 1 },
  { name: "Sara Almohammad", role: "Business Analyst", initials: "SM", analyse: 4, approved: 1, implement: 3, closed: 2 },
  { name: "Omar Alkhalid", role: "Product Owner", initials: "OK", analyse: 1, approved: 2, implement: 4, closed: 3 },
];

const POBAWidget: React.FC<POBAWidgetProps> = ({
  quarter = "Q4 2025",
  resources = SAMPLE_RESOURCES,
  defaultSelectedCount = 4,
  onSelectionChange,
}) => {
  const [selectedResources, setSelectedResources] = useState<string[]>(
    resources.slice(0, defaultSelectedCount).map((r) => r.name)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredResource, setHoveredResource] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredResources = resources.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const visibleResources = resources.filter((r) => selectedResources.includes(r.name));
  const totalClosed = visibleResources.reduce((sum, r) => sum + r.closed, 0);

  const toggleResource = (name: string) => {
    setSelectedResources((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const selectAll = () => {
    setSelectedResources(resources.map((r) => r.name));
  };

  const clearAll = () => {
    setSelectedResources([]);
  };

  const applySelection = () => {
    setIsOpen(false);
    onSelectionChange?.(selectedResources);
  };

  const isPO = (role: string) => role === "Product Owner";

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900">Product Owner / Business Analyst</h3>
          <span className="text-xs text-gray-400">{quarter}</span>
        </div>

        {/* Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-200 hover:bg-gray-50 transition-all"
          >
            <Users className="w-4 h-4 text-gray-400" />
            <span>Select Resources</span>
            {selectedResources.length > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#c69c6d" }}
              >
                {selectedResources.length}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Search */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Select All / Clear */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                <button
                  onClick={selectAll}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Select All
                </button>
                <span className="text-xs text-gray-400">
                  {selectedResources.length} of {resources.length} selected
                </span>
                <button
                  onClick={clearAll}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                >
                  Clear
                </button>
              </div>

              {/* Resource List */}
              <div className="max-h-64 overflow-y-auto">
                {filteredResources.map((resource) => {
                  const isSelected = selectedResources.includes(resource.name);
                  const isProductOwner = isPO(resource.role);
                  return (
                    <button
                      key={resource.name}
                      onClick={() => toggleResource(resource.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                        isSelected ? "bg-amber-50" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Mini Avatar */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: isProductOwner ? "#8b7355" : "#5c7c5c" }}
                      >
                        {resource.initials}
                      </div>

                      {/* Name */}
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-800">{resource.name}</div>
                      </div>

                      {/* Role Badge */}
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          backgroundColor: isProductOwner ? "#f5efe8" : "#e8f0e8",
                          color: isProductOwner ? "#8b7355" : "#5c7c5c",
                        }}
                      >
                        {isProductOwner ? "PO" : "BA"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Apply Button */}
              <div className="p-3 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={applySelection}
                  className="w-full py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "#c69c6d" }}
                >
                  Apply Selection
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resource Grid */}
      {visibleResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
          {visibleResources.map((resource) => {
            const isProductOwner = isPO(resource.role);
            const total = resource.analyse + resource.approved + resource.implement + resource.closed;
            const isHovered = hoveredResource === resource.name;

            return (
              <div
                key={resource.name}
                className="relative group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all cursor-default"
                onMouseEnter={() => setHoveredResource(resource.name)}
                onMouseLeave={() => setHoveredResource(null)}
              >
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: isProductOwner ? "#8b7355" : "#5c7c5c" }}
                >
                  {resource.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Name + Badge */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {resource.name}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{
                        backgroundColor: isProductOwner ? "#f5efe8" : "#e8f0e8",
                        color: isProductOwner ? "#8b7355" : "#5c7c5c",
                      }}
                    >
                      {isProductOwner ? "PO" : "BA"}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-gray-500">
                      Analyse: <strong className="text-gray-700">{resource.analyse}</strong>
                    </span>
                    <span className="text-gray-500">
                      Approved: <strong className="text-gray-700">{resource.approved}</strong>
                    </span>
                    <span className="text-gray-500">
                      Implement: <strong className="text-gray-700">{resource.implement}</strong>
                    </span>
                    <span className="text-gray-500">
                      Closed: <strong style={{ color: "#5c7c5c" }}>{resource.closed}</strong>
                    </span>
                  </div>
                </div>

                {/* Hover Card */}
                {isHovered && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-4 bg-white border border-gray-100 rounded-xl shadow-xl opacity-100 transition-all duration-200 z-50">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: isProductOwner ? "#8b7355" : "#5c7c5c" }}
                      >
                        {resource.initials}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{resource.name}</div>
                        <div className="text-xs text-gray-500">{resource.role} throughput</div>
                      </div>
                    </div>

                    {/* Metrics List */}
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-2">
                          <Search className="w-3 h-3" /> Analyse
                        </span>
                        <span className="font-semibold text-gray-800">{resource.analyse}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </span>
                        <span className="font-semibold text-gray-800">{resource.approved}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Implement
                        </span>
                        <span className="font-semibold text-gray-800">{resource.implement}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 flex items-center gap-2">
                          <FileCheck className="w-3 h-3" /> Closed
                        </span>
                        <span className="font-semibold" style={{ color: "#5c7c5c" }}>
                          {resource.closed}
                        </span>
                      </div>

                      {/* Total Row */}
                      <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
                        <span className="text-gray-600 font-medium flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" /> Total Throughput
                        </span>
                        <span className="font-bold" style={{ color: "#c69c6d" }}>
                          {total}
                        </span>
                      </div>
                    </div>

                    {/* Arrow Pointer */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No resources selected</p>
          <p className="text-xs text-gray-400 mt-1">Use the dropdown above to select resources</p>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>
          Showing {visibleResources.length} of {resources.length} resources
        </span>
        <span>
          Total Closed: <strong style={{ color: "#5c7c5c" }}>{totalClosed}</strong>
        </span>
      </div>
    </div>
  );
};

export default POBAWidget;
