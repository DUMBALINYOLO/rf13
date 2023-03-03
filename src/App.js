import React, { Component } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { G_DATA, NODE_IMAGES } from "./data";
import { forceCollide } from "d3-force";

const getImage = img => {
  const image = new Image();
  image.src = `${img}`;
  return image;
};
export default class App extends Component {
  constructor(props) {
    super(props);
    this.graphData = {
      nodes: [],
      links: []
    };
    this.higlightedNode = false;
    this.highlightedLinks = [];
    this.state = {
      searchTerm: "",
      loading: true,
      selectedEnvironment: undefined,
      showOverprivileged: false,
      hideUnconnected: true,
      nodeData: {},
      overprivilegedNodes: [],
      overprivilegedLinks: [],
      showServicesModal: false,
      serviceData: [],
      width: 0,
      height: 0,
      runtimeNodeVisibilityCheck: true
    };
  }
  componentDidMount = async () => {
    // INJECT EVENT LISTENER FOR SCREEN RESIZE
    window.addEventListener("resize", this.resizeCanvas);

    this.fetchData();
  };

  fetchData = async () => {
    await this.setState({ loading: true });
    this.graphData = G_DATA || {
      nodes: [],
      links: []
    };
    this.higlightedNode = false;
    this.highlightedLinks = [];
    await this.constructGraphData();
    await this.gatherOverprivilegeNodes();
    await this.toggleNodesVisibility();
    await this.toggleLinksVisibility();
    await this.initializeChargeForce();
    await this.setState({ loading: false });
  };

  resizeCanvas = () => {
    let ele = document.querySelector(".layoutContainer");
    this.setState({ width: ele.clientWidth, height: ele.clientHeight });
  };

  constructGraphData = () => {
    this.graphData.nodes.forEach(n => {
      n.img = getImage(NODE_IMAGES[n.serviceType][n.nodeType].img);
      n.imgd = getImage(NODE_IMAGES[n.serviceType][n.nodeType].imgd);
    });
  };

  toggleNodesVisibility = async () => {
    const { hideUnconnected, showOverprivileged } = this.state;
    this.graphData.nodes.forEach(node => {
      node.nodeVisible = !hideUnconnected
        ? showOverprivileged
          ? node.shouldHiglightForOverpriveleged
          : true
        : showOverprivileged
        ? node.shouldHiglightForOverpriveleged && !node.unconnected
        : !node.unconnected;
    });
  };

  toggleLinksVisibility = async () => {
    const {
      hideUnconnected,
      showOverprivileged,
      overprivilegedLinks
    } = this.state;
    this.graphData.links.forEach(link => {
      link.linkVisible = !hideUnconnected
        ? !showOverprivileged
          ? true
          : overprivilegedLinks.some(
              ol => ol.source === link.source.id && ol.target === link.target.id
            )
        : link.unconnected
        ? false
        : !showOverprivileged
        ? true
        : overprivilegedLinks.some(
            ol => ol.source === link.source.id && ol.target === link.target.id
          );
    });
  };

  highlightNode = node => {
    let nodeDescendants = [];
    this.graphData.nodes.forEach(n => {
      if (node && n.id === node.id) {
        n.highlight = true;
        this.higlightedNode = true;
        nodeDescendants = [...n.descendants];
      } else {
        n.highlight = false;
        this.higlightedNode = false;
      }
    });
    node &&
      this.graphData.nodes.forEach(n => {
        nodeDescendants.forEach(d => d === n.id && (n.highlight = true));
      });
    this.highlightedLinks = [...node.links] || [];
    this.checkIfHighlightedNode();
    this.setState({ nodeData: node.sideBar });
  };
  checkIfHighlightedNode = () => {
    this.higlightedNode = this.graphData.nodes.some(n => n.highlight === true);
  };
  resetHighlightedNodes = () => {
    this.graphData.nodes.forEach(n => {
      n.highlight = false;
    });
    this.higlightedNode = false;
    this.highlightedLinks = [];
    this.setState({ nodeData: {} });
  };

  gatherOverprivilegeNodes = () => {
    let overprivilegedNodes = [];
    let overprivilegedLinks = [];
    overprivilegedNodes = this.graphData.nodes.forEach(n => {
      if (n.overprivileged === true) {
        overprivilegedLinks = [...overprivilegedLinks, ...n.links];
      }
    });
    this.setState({
      overprivilegedNodes,
      overprivilegedLinks
    });
  };

  initializeChargeForce = () => {
    let fg = this.refs.fgref;
    fg.d3Force("center", null);
    fg.d3Force("charge", null);

    // Add collision and bounding box forces
    fg.d3Force("collide", forceCollide(30));
  };
  render() {
    const { width, height } = this.state;
    return (
      <div>
        <div className="layoutContainer">
          <div className="graphContainer">
            <ForceGraph2D
              ref="fgref"
              graphData={this.graphData}
              dagLevelDistance={100}
              d3VelocityDecay={0.9}
              width={width || 1000}
              height={height || 500}
              nodeRelSize={15}
              nodeCanvasObject={(
                { id, name, highlight, img, imgd, x, y },
                ctx
              ) => {
                const size = 30;
                // ctx.font = "6px Calibri";
                // ctx.fillText(name, x, y+15);
                ctx.drawImage(
                  !highlight && this.higlightedNode ? imgd : img,
                  x - size / 2,
                  y - size / 2,
                  size,
                  size
                );
              }}
              nodeVisibility={node => node.nodeVisible}
              linkVisibility={link => link.linkVisible}
              linkColor={link =>
                !this.higlightedNode
                  ? "rgba(150,150,150, 1)"
                  : this.highlightedLinks.some(
                      hl =>
                        hl.source === link.source.id &&
                        hl.target === link.target.id
                    )
                  ? "red"
                  : "rgba(150,150,150, 0.3)"
              }
              linkLabel={link => link.label}
              linkWidth={1}
              linkDirectionalArrowLength={5}
              linkDirectionalArrowRelPos={3}
              onNodeClick={this.highlightNode}
              onBackgroundClick={this.resetHighlightedNodes}
              onZoom={z => {
                this.zoom = z.k;
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}
