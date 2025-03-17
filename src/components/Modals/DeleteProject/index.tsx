import { Storage } from "aws-amplify";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "state/hooks";
import { selectSimulationProperties } from "state/reducers/simulationPropertiesSlice";
import { v4 as uuid } from "uuid";
import Modal from "../../Modal";
import { selectUsername } from "state/reducers/authSlice";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import defaultMaterials from "materials.json";
import Plot from "react-plotly.js";
import MyIcon from "assets/MyIcons";

interface DeleteProjectModalProps {
  projectId: string;
  projectName: string;
  visible: boolean;
  setVisible: (value: boolean) => void;
}

const DeleteProjectModal = (props: DeleteProjectModalProps) => {
  const { visible, setVisible } = props;
  const { projectId } = props;
  const { projectName } = props;
  const [isLoading, setIsLoading] = useState(false);

  const currentUsername = useAppSelector(selectUsername);

  const navigate = useNavigate();

  const keyDownFunc = (event: any) => {
    if (visible) {
      if (event.key === "Escape") {
        console.log("delete project");
        setVisible(false);
        document.removeEventListener("keydown", keyDownFunc);
      } else if (event.key === "Enter") {
        document.getElementById("element-ok-btn")?.click();
        document.removeEventListener("keydown", keyDownFunc);
      }
    }
  };
  document.addEventListener("keydown", keyDownFunc);

  const handleDelete = async (evt: any) => {
    try {
      setIsLoading(true);
      Storage.list(`${currentUsername}/projects/${projectId}`, {
        pageSize: 1000,
      }).then(async (data) => {
        const { results } = data;
        const promises = results.map(async (result) => {
          if (result.key) {
            await Storage.remove(result.key);
          }
        });
        await Promise.all(promises);
      });
      await new Promise((r) => setTimeout(r, 1000));

      Storage.list(`${currentUsername}/projects/`, { pageSize: 1000 }).then(
        async (data) => {
          let projectData: any[] = [];
          const { results } = data;
          const projects: any[] = [];
          results.forEach((result) => {
            if (result.key?.includes("info.json")) {
              projects.push(result);
            }
          });
          const promises = projects.map(async (project) => {
            let info: any = {};
            const infoData = await Storage.get(project.key, {
              download: true,
              cacheControl: "no-cache",
            });
            if (infoData.Body) {
              const dataBody: any = infoData.Body;
              const dataString = await dataBody.text();
              const json = JSON.parse(dataString);
              info = json;
            }
            const projectData = {
              id: project.key.split("/").at(-2),
              lastModified: project.lastModified,
              ...info,
            };
            return projectData;
          });
          projectData = await Promise.all(promises);
        }
      );
      setVisible(false);
      setIsLoading(false);
      window.location.reload();
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <Modal
      visible={visible}
      title={""}
      buttons={
        <>
          <button
            type="button"
            id="element-ok-btn"
            className={`relative w-full sm:w-20 h-9 flex items-center justify-center shadow-sm sm:ml-2 my-auto font-medium text-sm rounded-md focus:outline-none text-white ${
              !isLoading
                ? "bg-error-600 hover:bg-error-700 active:bg-error-800 hover:transition duration-150 shadow-lg hover:shadow-error-600/50"
                : "bg-error-300"
            }`}
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <svg
                aria-hidden="true"
                className="w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-white"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
            ) : (
              "Delete"
            )}
          </button>
          <button
            type="button"
            className="relative h-9 items-center sm:ml-2 my-auto mt-3 inline-flex w-full sm:w-20 justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 active:bg-gray-100 sm:mt-0"
            onClick={() => setVisible(false)}
          >
            Cancel
          </button>
        </>
      }
    >
      <form>
        <div className="grid grid-cols-1 gap-y-4 mx-2">
          <div className="grid grid-cols-1 gap-x-2">
            <div className="ml-2 col-span-1">
              <h3>
                <a className="font-medium underline">Delete project:</a>{" "}
                <a className="italic">{projectName}</a>
              </h3>
              <a className="pt-4 block text-md text-gray-900">
                Are you sure you wish to delete this project?
              </a>
              <a className="italic block text-sm leading-6 text-gray-400">
                Due to our security policies, all data will be permanently
                erased.
              </a>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default DeleteProjectModal;
