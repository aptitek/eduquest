import { createContext, useContext } from 'react';

export interface EditableFieldContextValue {
  /** Profile / card is in always-editable mode — show pencil hints */
  showPencil: boolean;
}

export const EditableFieldContext = createContext<EditableFieldContextValue>({
  showPencil: false,
});

export function useEditableFieldContext() {
  return useContext(EditableFieldContext);
}
