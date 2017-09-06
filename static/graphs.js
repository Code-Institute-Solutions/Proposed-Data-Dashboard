queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs);


function makeGraphs(error, salaryData) {
    var ndx = crossfilter(salaryData);

    salaryData.forEach(function(d){
        d.salary = parseInt(d.salary);
        d.yrs_since_phd = parseInt(d["yrs.since.phd"]);
        d.yrs_service = parseInt(d["yrs.service"]);
    });

    show_discipline_selector(ndx);
    show_percent_that_are_professors(ndx, "Female", "#percent-of-women-professors");
    show_percent_that_are_professors(ndx, "Male", "#percent-of-men-professors");
    show_gender_balance(ndx);
    show_average_salaries(ndx);
    show_rank_distribution(ndx);
    show_service_to_salary_correlation(ndx);
    show_phd_to_salary_correlation(ndx);

    dc.renderAll();
}


function show_discipline_selector(ndx) {
    var disciplineDim = ndx.dimension(dc.pluck("discipline"));
    var disciplineSelect = disciplineDim.group();

    dc.selectMenu("#discipline-selector")
        .dimension(disciplineDim)
        .group(disciplineSelect);
}


function show_percent_that_are_professors(ndx, gender, element) {
    var percentageThatAreProf = ndx.groupAll().reduce(
        function (p, v) {
            if (v.sex === gender) {
                p.count++;
                if (v.rank === "Prof") {
                   p.are_prof++;
                }
            }
            return p;
        },
        function (p, v) {
            if (v.sex === gender) {
                p.count--;
                if (v.rank === "Prof") {
                   p.are_prof--;
                }
            }
            return p;
        },
        function () {
            return {count: 0, are_prof: 0};
        }
    );

    dc.numberDisplay(element)
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {
            if (d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreProf);
}


function show_gender_balance(ndx) {
    var genderDim = ndx.dimension(dc.pluck("sex"));
    var genderMix = genderDim.group();

    dc.barChart("#gender-balance")
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(genderDim)
        .group(genderMix)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
}


function show_average_salaries(ndx) {
    var genderDim = ndx.dimension(dc.pluck("sex"));
    var averageSalaryByGender = genderDim.group().reduce(
        function (p, v) {
            p.count++;
            p.total += v.salary;
            return p;
        },
        function (p, v) {
            p.count--;
            if (p.count == 0) {
                p.total = 0;
            } else {
                p.total -= v.salary;
            }
            return p;
        },
        function () {
            return {count: 0, total: 0};
        }
    );

    dc.barChart("#average-salary")
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(genderDim)
        .group(averageSalaryByGender)
        .valueAccessor(function (d) {
            if (d.value.count == 0) {
                return 0;
            } else {
                return d.value.total / d.value.count;
            }
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}


function show_rank_distribution(ndx) {
    var genderDim = ndx.dimension(dc.pluck("sex"));

    var rankByGenderAssocProf = genderDim.group().reduceSum(function (d) {
        if (d.rank === "AssocProf") {
            return 1;
        } else {
            return 0;
        }
    });
    var rankByGenderAsstProf = genderDim.group().reduceSum(function (d) {
        if (d.rank === "AsstProf") {
            return 1;
        } else {
            return 0;
        }
    });
    var rankByGenderProf = genderDim.group().reduceSum(function (d) {
        if (d.rank === "Prof") {
            return 1;
        } else {
            return 0;
        }
    });

    dc.barChart("#rank-distribution")
        .width(400)
        .height(300)
        .dimension(genderDim)
        .group(rankByGenderAssocProf, "Assoc Prof")
        .stack(rankByGenderAsstProf, "Asst")
        .stack(rankByGenderProf, "Prof")
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(420).y(0).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 30, left: 30});
}


function show_service_to_salary_correlation(ndx) {
    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);

    var eDim = ndx.dimension(dc.pluck("yrs_service"));
    var experienceDim = ndx.dimension(function(d){
        return [d.yrs_service, d.salary, d];
    });
    var experienceSalaryGroup = experienceDim.group();

    var minExperience = eDim.bottom(1)[0].yrs_service;
    var maxExperience = eDim.top(1)[0].yrs_service;

    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minExperience,maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Of Service")
        .title(function (d) {
            return d.key[2].rank + " earned " + d.key[2].salary;
        })
        .colorAccessor(function (d) {
            return d.key[2].sex;
        })
        .colors(genderColors)
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}


function show_phd_to_salary_correlation(ndx) {
    var genderColors = d3.scale.ordinal()
        .domain(["Female", "Male"])
        .range(["pink", "blue"]);

    var pDim = ndx.dimension(dc.pluck("yrs_since_phd"));
    var phdDim = ndx.dimension(function(d){
        return [d.yrs_since_phd, d.salary, d];
    });
    var phdSalaryGroup = phdDim.group();

    var minPhd = pDim.bottom(1)[0].yrs_since_phd;
    var maxPhd = pDim.top(1)[0].yrs_since_phd;

    dc.scatterPlot("#phd-salary")
        .width(800)
        .height(400)
        .x(d3.scale.linear().domain([minPhd,maxPhd]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .yAxisLabel("Salary")
        .xAxisLabel("Years Since PhD")
        .title(function (d) {
            return d.key[2].rank + " earned " + d.key[2].salary;
        })
        .colorAccessor(function (d) {
            return d.key[2].sex;
        })
        .colors(genderColors)
        .dimension(phdDim)
        .group(phdSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}
