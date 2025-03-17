type Materials = {
  [key: string]: {
    color: string;
    epsilon?: number;
    kappa?: number;
    mu?: number;
    custom?: boolean;
  };
};

export default Materials;
