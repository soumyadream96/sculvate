import { createContext } from "react";

interface IActiveContextMenuContext {
  activeContextMenu: string;
  contextMenuLocation: 0 | 1 | 2;
  setActiveContextMenu: (contextMenuType: string, location: 0 | 1 | 2) => void;
}

const ActiveContextMenuContext =
  createContext<IActiveContextMenuContext | null>(null);

export default ActiveContextMenuContext;
