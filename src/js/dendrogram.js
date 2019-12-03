//Much of this code is from Mike Bostock at https://observablehq.com/@d3/hierarchical-edge-bundling
//or adapted from his work.

class Dendrogram {
    constructor() {
        this.config = {
            listWidth: 150,
            width: 900,
            startYear: 1948,
            endYear: 2018,
        }

        this.cumulative = false;
        this.year = 2018;

        d3.select('#cumulative-checkbox')
            .on('click', (d, i) => {
                this.cumulative = !this.cumulative;
                this.updateYear(this.year);
            })
        ;

        this.listSvg = d3.select('#trade-chart')
            .append('svg')
            .attr('width', this.config.listWidth)
            .attr('height', this.config.width)
        ;
        
        this.dendroSvg = d3.select('#trade-chart')
            .append('svg')
            .attr('width', this.config.width)
            .attr('height', this.config.width)
            .attr("viewBox", [-this.config.width / 2, -this.config.width / 2, this.config.width, this.config.width])
        ;

        
        this.yearList = this.listSvg.append('g')
            .attr('id', 'year-list')
        ;
    }

    display(data) {
        this.data = data;

        let tree = d3.cluster()
            .size([2 * Math.PI, this.config.width / 2 - 100]) // angle in radians
        ;

        let root = tree(this.bilink(d3.hierarchy(data)
            .sort((a, b) => // this sorts the nodes alphabetically around the edge of the dendrogram.
                d3.ascending(a.height, b.height) || d3.ascending(a.data.name, b.data.name)
            )
        )); 
        
        const node = this.dendroSvg.append("g") // note that the nodes have no mark, just a label
            .attr('id', 'dendrogram-node-label')
            .selectAll("g")
            .data(root.leaves())
            .join("g")
            .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
            .append("text")
            .attr("dy", "0.31em")
            .attr("x", d => d.x < Math.PI ? 6 : -6)
            .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
            .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
            .text(d => d.data.name)
            .each(function(d) { d.text = this; })
            //.on("mouseover", overed)
            //.on("mouseout", outed)
            //.call(text => text.append("title").text(d => `${id(d)} // for tooltip
                //${d.outgoing.length} outgoing
                // ${d.incoming.length} incoming`))
        ;

        //let colorin = "#00f";
        //let colorout = "#f00";
        
        let line = d3.lineRadial() // delete one of the two
            .curve(d3.curveBundle.beta(0.85))
            .radius(d => d.y)
            .angle(d => d.x)
        ;
       
        this.linksByYear = {};
        let y = 10;
        let dy = this.config.width / 75;
        for (let i = this.config.startYear; i <= this.config.endYear; ++i) {
            this.linksByYear[i] = [];
            let t = this.yearList.append('text')
                .attr('x', 20)
                .attr('y', y)
                .html(i)
                .on('click', (d, z) => {
                    this.updateYear(i);
                })
            ;
            y += dy;
        }

        //note that outgoing = [myselfnode, linkdestinationnodej, treatyname, yearsigned]
        let linkData = root.leaves().flatMap(leaf => leaf.outgoing);
    
        for (const o of linkData) {
            let year = o[3];
            let d = line(o[0].path(o[1]));
            if (year != "") {
                this.linksByYear[year].push([o[2], d]);
            }
        }

        let colornone = "#ccc";
        this.dendroSvg.append("g")
            .attr('id', 'dendro-links')
            .attr("stroke", colornone)
            .attr("fill", "none")
        ;

        this.cumulativeHelper = {};
        this.updateYear(2018);
    }

    updateYear(year) {
        let data = this.linksByYear[year];
        if (this.cumulative == true) {
            for (let i = year - 1; i >= this.config.startYear; --i) {
                if (i in this.cumulativeHelper) {
                    data = data.concat(this.cumulativeHelper[i]);
                    break;
                } else {
                    data = data.concat(this.linksByYear[i]);
                }
                
            }
            if (!(year in this.cumulativeHelper)) {
                this.cumulativeHelper[year] = data;
            }
        }

        d3.select('#dendro-links')
            .selectAll("path")
            .data(data)
            .join('path')
            .style("mix-blend-mode", "multiply")
            .attr('d', ([name, path]) => path)
            //.each(function(d) { d.path = this; })
        ;
        
        this.year = year;
    }



    bilink(root) {
        const map = new Map(root.leaves().map(d => [d.data.name, d]));
        for (const d of root.leaves()) {
            //d.incoming = [];

            //create outgoing array. outgoing = [myselfnode, linkdestinationnodej, treatyname, yearsigned]
            if (d.data.abcfta) {
                d.outgoing = d.data.abcfta.map(fta => [d, map.get(fta.with), fta.treaty, fta.year]);
            } else {
                d.outgoing = [];
            }
        }
        
        //for (const d of root.leaves()) for (const o of d.outgoing) o[1].incoming.push(o);
        return root;
      }
}

