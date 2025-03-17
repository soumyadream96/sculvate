import { Transition, Dialog } from "@headlessui/react";
import React from "react";
import { Fragment, ReactNode, useRef, useEffect } from "react";
import Draggable from "react-draggable";
import { twMerge } from "tailwind-merge";

interface DraggableModalProps {
  children: ReactNode;
  visible: boolean;
  title: ReactNode;
  buttons: ReactNode;
  className?: string;
  buttonsClassName?: string;
}

const DraggableModal = (props: DraggableModalProps) => {
  const { children, visible, title, buttons, buttonsClassName } = props;

  const watchForInert = (element: Node) => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "inert" &&
          element instanceof HTMLElement
        ) {
          const htmlElement = element as HTMLElement;
          htmlElement.removeAttribute("inert");
        }
      });
    });

    observer.observe(element, {
      attributes: true, // watch only for attribute changes
    });
  };

  const rootElement = document.querySelector("#root");
  watchForInert(rootElement || document.body);

  useEffect(() => {
    if (visible) {
      document
        .getElementsByTagName("aside")[0]
        ?.setAttribute("inert", visible.toString());
      document
        .getElementsByTagName("nav")[0]
        ?.setAttribute("inert", visible.toString());
      document
        .getElementsByClassName("tab-bar")[0]
        ?.setAttribute("inert", visible.toString());
      document
        .getElementById("parameters-bar")
        ?.setAttribute("inert", visible.toString());
    } else {
      document.getElementsByTagName("aside")[0]?.removeAttribute("inert");
      document.getElementsByTagName("nav")[0]?.removeAttribute("inert");
      document.getElementsByClassName("tab-bar")[0]?.removeAttribute("inert");
      document.getElementById("parameters-bar")?.removeAttribute("inert");
    }
  }, [visible]);

  const nodeRef = React.useRef(null);

  return (
    <Transition.Root show={visible} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        open={visible}
        onClose={() => {}}
      >
        <Draggable
          nodeRef={nodeRef}
          cancel=".disable-drag"
          defaultPosition={{
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
          }}
          positionOffset={{ x: "-50%", y: "-50%" }}
          defaultClassName={props.className}
        >
          <div
            ref={nodeRef}
            className="modal-window fixed inset-0 z-10 overflow-y-auto"
            style={{ width: "max-content", height: "max-content" }}
          >
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:p-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-100"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-100"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                static
              >
                <Dialog.Panel className="relative overflow-hidden rounded-lg bg-white bg-opacity-[0.7] backdrop-blur-md text-left shadow-xl border border-primary-600 cursor-move">
                  <div className="sm:flex sm:items-start">
                    <div className="text-left w-full">
                      <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                        {title}
                      </Dialog.Title>
                      <div className="mt-2 px-4">{children}</div>
                    </div>
                  </div>
                  <div
                    className={twMerge(
                      "px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6",
                      buttonsClassName
                    )}
                  >
                    {buttons}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Draggable>
      </Dialog>
    </Transition.Root>
  );
};

export default DraggableModal;
