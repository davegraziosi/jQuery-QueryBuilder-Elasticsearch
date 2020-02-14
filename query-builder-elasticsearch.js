/*
* jQuery QueryBuilder Elasticsearch 'bool' query support
* https://github.com/mistic100/jQuery-QueryBuilder
* https://www.elastic.co/
* https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html
*/

// Register plugin
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery', 'query-builder'], factory);
    }
    else {
        factory(root.jQuery);
    }
}(this, function($) {
    "use strict";

    var QueryBuilder = $.fn.queryBuilder;

    // DEFAULT CONFIG
    // ===============================
    QueryBuilder.defaults({
    
    	DateExpressions: {
	        'NOW' : 'now',
	        'NOW - 1' : 'now-1d',
		'TRUNC(NOW)': 'now/d',
		//'TRUNC(NOW)-1': 'now/d-1d',
		//'TRUNC(NOW)-30': 'now/d-30d',
		//'TRUNC(NOW)-1 second' : 'now/d-1s',
		'TRUNC(ADD_MONTHS(NOW, -1),MM)' : 'now-1M/M',
		'TRUNC(NOW,MM)-1 second' : 'now/M-1s',
		'TRUNC(NOW,IW)' : 'now/w',
		'TRUNC(TO_DATE(NOW),IW)+7-1 second' : 'now/w+7d-1s',
		'SYSDATE' : 'now',
		'SYSDATE - 1' : 'now-1d',
		'TRUNC(SYSDATE,\'IW\')' : 'now/w',
		'TRUNC(SYSDATE,\'IW\')+7-1/86400': 'now/w+7d-1s',
		'TRUNC(ADD_MONTHS(SYSDATE, -1),\'MM\')': 'now-1M/M',
		'TRUNC(SYSDATE,\'MM\')-1/86400' : 'now/M-1s'
	},
        ESBoolOperators: {
            is_empty:         function(){ return "term"; },
            is_null:          function(){ return "exists"; },
            is_not_empty:     function(){ return "term"; },
            is_not_null:      function(){ return "exists"; },
            contains:         function(v){ if (typeof v === 'string') return escapeBackSlash(v.toLowerCase()); else return v; },
   	    not_contains:     function(v){ if (typeof v === 'string') return escapeBackSlash(v.toLowerCase()); else return v; },
            equal:            function(v){ if (typeof v === 'string') return escapeBackSlash(v.toLowerCase()); else return v; },
            not_equal:        function(v){ if (typeof v === 'string') return escapeBackSlash(v.toLowerCase()); else return v; },
	    begins_with:      function(v){ if (typeof v === 'string') return escapeBackSlash(v.toLowerCase()); else return v; },
	    ends_with:      function(v){ if (typeof v === 'string') return escapeBackSlash(v.toLowerCase()); else return v; },
	    not_begins_with:      function(v){ if (typeof v === 'string') return escapeBackSlash(v.toLowerCase()); else return v; },
	    not_ends_with:      function(v){ if (typeof v === 'string') return escapeBackSlash(v.toLowerCase()); else return v; },
            less:             function(v){ return {'lt': v}; },
            less_or_equal:    function(v){ return {'lte': v}; },
            greater:          function(v){ return {'gt': v}; },
            greater_or_equal: function(v){ return {'gte': v}; },
            between:          function(v){ return {'gte': v[0], 'lte': v[1]}; },
	    not_between:      function(v){ return {'gte': v[0], 'lte': v[1]}; },
            in :              function(v){ if (typeof v === 'string') return v.split(',').map(function(e) { return escapeBackSlash(e.toString().trim().toLowerCase());});
            							  else return v.map(function(e) { return escapeBackSlash(e.toString().trim().toLowerCase());}); },
            not_in:           function(v){ if (typeof v === 'string') return v.split(',').map(function(e) { return escapeBackSlash(e.toString().trim().toLowerCase());});
            							   else return v.map(function(e) { return escapeBackSlash(e.toString().trim().toLowerCase());}); },
	        last_n_minutes:   function(v){ 
			     if (Array.isArray(v) && v.lenght==2 )  
				return {'gte': v[0], 'lt': v[1], 'time_zone': moment.tz.guess()};
			     else
				return {'gte': 'now-'+v+'m', 'time_zone': moment.tz.guess()}; 
			},
	        period:           function(v){
                var subOp = v[0];
                switch (subOp) {
                    case 'days':
                        return {'gte': 'now/d-'+v[1]+'d', 'lt': 'now/d-1s', 'time_zone': moment.tz.guess()};
                        // "BETWEEN (TRUNC(SYSDATE) - INTERVAL '" + values[1] + "' day) AND TRUNC(SYSDATE)"
                    case 'day':
                        return {'gte': 'now-1d', 'time_zone': moment.tz.guess()};
                        // 'BETWEEN SYSDATE - 1 AND SYSDATE'
                    case 'week':
                        return {'gte': 'now/w', 'lt': 'now/w+7d-1s', 'time_zone': moment.tz.guess()}
                        // "BETWEEN TRUNC(SYSDATE,'IW') AND TRUNC(SYSDATE,'IW')+7-1/86400";
                    case 'month':
                        return {'gte': 'now-1M/M', 'lt': 'now/M-1s', 'time_zone': moment.tz.guess()};
                        // "BETWEEN TRUNC(ADD_MONTHS(SYSDATE, -1),'MM') AND (TRUNC(SYSDATE,'MM')-1/86400)";	
                } 
                return {'gte': v[0], 'lt': v[1], 'time_zone': moment.tz.guess()}; 
            },
	        before_last_n_minutes:   function(v){ 
                if (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.exec(v))) 
                    return {'lt': 'now-'+v+'m', 'time_zone': moment.tz.guess()}; 
                else
                    return {'lt': v, 'time_zone': moment.tz.guess()};
            },
            before_last_n_days:   function(v){ 
                if (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.exec(v))) 
                    return {'lt': 'now-'+v+'d', 'time_zone': moment.tz.guess()}; 
                else 
                    return {'lt': v, 'time_zone': moment.tz.guess()};
            },
	        // last_n_minutes:   function(v){ return {'gte': v[0], 'lt': v[1], 'time_zone': moment.tz.guess()}; },
	        // period:           function(v){ return {'gte': v[0], 'lt': v[1], 'time_zone': moment.tz.guess()}; },
	        // before_last_n_minutes:   function(v){ return {'lt': v, 'time_zone': moment.tz.guess()}; },
		
        }, 
	ESBoolDateOperators: {
            equal:            function(v){ return {'lte': v, 'gte': v, 'format' : 'yyyy-MM-dd HH:mm:ssZ'}; },
            not_equal:        function(v){ return {'lte': v, 'gte': v, 'format' : 'yyyy-MM-dd HH:mm:ssZ'}; },
	    less:             function(v){ return {'lt': v , 'format' : 'yyyy-MM-dd HH:mm:ssZ'}; },
            less_or_equal:    function(v){ return {'lte': v, 'format' : 'yyyy-MM-dd HH:mm:ssZ'}; },
            greater:          function(v){ return {'gt': v, 'format' : 'yyyy-MM-dd HH:mm:ssZ'}; },
            greater_or_equal: function(v){ return {'gte': v, 'format' : 'yyyy-MM-dd HH:mm:ssZ'}; },
            between:          function(v){ return {'gte': v[0], 'lte': v[1], 'format' : 'yyyy-MM-dd HH:mm:ssZ'}; },
	    not_between:      function(v){ return {'gte': v[0], 'lte': v[1], 'format' : 'yyyy-MM-dd HH:mm:ssZ'}; },
	}
    });
  

    // PUBLIC METHODS
    // ===============================
    QueryBuilder.extend({
	
        /**
        * Get rules as an elasticsearch bool query
        * @param data {object} (optional) rules
        * @return {object}
        */
        getESBool: function(data) {
            data = (data===undefined) ? this.getRules() : data;

            var that = this;

            return (function parse(data) {
		if (!data || !data.rules) {
                    return {};
                }

                if (!data.condition) {
                    data.condition = that.settings.default_condition;
                }

                if (['AND', 'OR'].indexOf(data.condition.toUpperCase()) === -1) {
                    throw new Error(
                        'Unable to build Elasticsearch bool query with condition "{0}"'
                        .replace('{0}', data.condition)
                    );
                }

                var parts = {};
                parts.add = function (k, v) {
                    if (this.hasOwnProperty(k)) { this[k].push(v) }
                    else { this[k] = [v] }
                };

                data.rules.forEach(function(rule) {

                    function get_value(rule) {
                        if (rule.data && rule.data.hasOwnProperty('transform')) {
                            return window[rule.data.transform].call(this, rule.value);
                        } else {
			    if (rule.operator === 'begins_with' || rule.operator === 'not_begins_with') return rule.value+".*";
			    if (rule.operator === 'ends_with' || rule.operator === 'not_ends_with') return ".*"+rule.value;
			    if (rule.operator === 'contains' || rule.operator === 'not_contains') return ".*"+rule.value+".*";
                            if (rule.operator === 'is_empty' || rule.operator === 'is_not_empty') return "";
                            return rule.value;
                        }
                    }

                    function transformDateExpression(value) {
            			var transfVal = that.settings.DateExpressions[value] || value;
            			
            			var minutes = /^(?:NOW|SYSDATE) - (?:INTERVAL )?'?(\d+)'? minute$/.exec(value);
            			var days = /^TRUNC\((?:NOW|SYSDATE)\) - (?:INTERVAL )?'?(\d+)'?(?: day)?$/.exec(value);
            			if (minutes) return "now-"+minutes[1]+"m";
            			if (days) return "now-"+days[1]+"d/d";
            			
            			if (/^\d{4}-\d{2}-\d{2}/.exec(value)) transfVal = addTimezoneToDate(transfVal);
            			
            			return transfVal;
            		}
		   
           
           
		   function addTimezoneToDate (value) {
			var myDate = value.replace(/-/g, "/");
			var dateValue = new Date(Date.parse(myDate));
			var numberformatter = new Intl.NumberFormat('it', { minimumIntegerDigits: 2 });
			var timezoneoffset = -1 * dateValue.getTimezoneOffset() / 60;
			return value + (dateValue.getTimezoneOffset()<0?"+":"")+numberformatter.format(timezoneoffset)+":00";
		   }
                    
                    function make_query(rule) {
                        var mdb = that.settings.ESBoolOperators[rule.operator],
                        ope = that.getOperatorByType(rule.operator),
                        part = {};

                        if (mdb === undefined) {
                            throw new Error(
                                'Unknown elasticsearch operation for operator "{0}"'
                                .replace('{0}', rule.operator)
                            );
                        }

			if (rule.data && rule.data.hasOwnProperty('lowercase'))
                               rule.field = rule.field+".lowercase";

                        if (ope.nb_inputs !== 0) {
                            var es_key_val = {};
                            if ( /^date/.exec(rule.type) ) {
				var useterm,useterms = "";
				/*if (/.custom$/.exec(rule.field) ) {
	    			rule.field = rule.field.replace(".custom", '');*/
					var myDate = get_value(rule);
					var _myDates ;
					if (Array.isArray(myDate)) {
					   _myDates = [];
					   myDate.forEach(function(value, index) {
						   _myDates[index] = transformDateExpression(value); 
					   });
					}else {
						_myDates = transformDateExpression(myDate);
					}
					
					if (rule.operator in that.settings.ESBoolDateOperators) {
						  mdb = that.settings.ESBoolDateOperators[rule.operator];
					}
			        es_key_val[rule.field] =  mdb.call(that, _myDates);
				    part[getQueryDSLWord(rule, true)] = es_key_val;
				    
				/*}*/
				
			    } else {
			        es_key_val[rule.field] =  mdb.call(that, get_value(rule));
			        part[getQueryDSLWord(rule)] = es_key_val;                              
			    }
                        } 
			else {
			    var es_key_val = mdb.call(that, rule.value);
			    var val = {};
                            if (es_key_val === 'exists') {
                            	 val["field"] = rule.field ;
			    } else if (es_key_val === 'term') {
				 val[rule.field] = get_value(rule);
                            }
			    part[es_key_val] = val;
                        } 

                        // this is a corner case, when we have an "or" group and a negative operator,
                        // we express this with a sub boolean query and must_not.
                        if (data.condition === 'OR' && (rule.operator === 'not_equal' || rule.operator === 'not_in' 
                                                || rule.operator === 'not_contains'   || rule.operator === 'not_begins_with'   
                                                || rule.operator === 'not_ends_with'  || rule.operator === 'is_null' 
                                                || rule.operator === 'is_not_empty' )) {
                            return {'bool': {'must_not': [part]}}
                        } else {
                            return part
                        }
                    }

                    var clause = getClauseWord(data.condition, rule.operator);

                    if (rule.rules && rule.rules.length>0) {
                        parts.add(clause, parse(rule));
                    } else {
                        parts.add(clause, make_query(rule));
                    }

                });

                delete parts.add;
                return {'bool': parts}
            }(data));
        }

        /**
        * Get rules as an elasticsearch query string query
        * @param data {object} (optional) rules
        * @return {object}
        */
        
        /*
        ,getESQueryStringQuery: function(data) {
            data = (data===undefined) ? this.getRules() : data;

            var that = this;

            return (function parse(data) {
                if (!data.condition) {
                    data.condition = that.settings.default_condition;
                }

                if (['AND', 'OR'].indexOf(data.condition.toUpperCase()) === -1) {
                    throw new Error(
                        'Unable to build Elasticsearch query String query with condition "{0}"'
                        .replace('{0}', data.condition)
                    );
                }

                if (!data.rules) {
                    return "";
                }

                // generate query string
                var parts = "";

                data.rules.forEach(function(rule, index) {
                    function get_value(rule) {
                            return rule.value;
                    }

                    function make_query(rule) {
                        var mdb = that.settings.ESQueryStringQueryOperators[rule.operator],
                        ope = that.getOperatorByType(rule.operator),
                        part = "";

                        if (mdb === undefined) {
                            throw new Error(
                                'Unknown elasticsearch operation for operator "{0}"'
                                .replace('{0}', rule.operator)
                            );
                        }

                        var es_key_val = "";
                        if (ope.nb_inputs !== 0) {
                            es_key_val += rule.field + ":" + mdb.call(that, rule.value);
                            part += es_key_val;
                        }
                        else if (ope.nb_inputs === 0) {
                            es_key_val += mdb.call(that, rule.value) + rule.field;
                            part += es_key_val;
                        }

                        if(data.rules[index+1]) {
                            return part + " " + data.condition + " ";
                        }
                        else {
                            return part;
                        }

                    }
                    if (rule.rules && rule.rules.length>0) {
                        parts += "(" + parse(rule) + ")";
                    } else {
                        parts += make_query(rule);
                    }

                });
                return parts;
            }(data));
        }*/
    });

    /**
    * Get the right type of query term in elasticsearch DSL
    */
    function getQueryDSLWord(rule, isDate) {
        var term = /^(equal|not_equal|is_empty|is_not_empty)$/.exec(rule.operator),
            wildcard = /.(\*|\?)/.exec(rule.value),
            terms = /^(in|not_in)$/.exec(rule.operator),
	    matchs = /^(contains|not_contains)$/.exec(rule.operator),
	    begins_ends = /.*(begins_with|ends_with)$/.exec(rule.operator);

        if (term !== null && wildcard !== null) { return 'wildcard'; }
        if (term !== null) { return (!isDate ? 'term' : 'range'); } //TODO riportare le modifiche nel altro progetto
        if (terms !== null) { return 'terms'; } 
        if (matchs !== null) { return 'regexp'; }
        if (begins_ends !== null) { return 'regexp'; }
        return 'range';
    }

    /**
    * Get the right type of clause in the bool query
    */
    function getClauseWord(condition, operator) {
        if (condition === 'AND' && (operator !== 'not_equal' && operator !== 'not_in' && operator !== 'not_contains'
                                     && operator !== 'not_begins_with' && operator !== 'not_ends_with' 
                                     && operator !== 'is_null' && operator !== 'is_not_empty' 
                                     &&  operator !== 'not_between')) { return 'must' }
        if (condition === 'AND' && (operator === 'not_equal' || operator === 'not_in' || operator === 'not_contains'
				    || operator === 'not_begins_with' || operator === 'not_ends_with' || 
                                     operator === 'is_null' || operator === 'is_not_empty' || 
                                     operator === 'not_between')) { return 'must_not' }
        if (condition === 'OR') { return 'should' }
    }

    function escapeBackSlash(value) {
    	if (typeof value != 'string') {
            return value;
        }

        return value
            .replace(/[\\]/g, function(s) {
                switch (s) {
                    // @formatter:off
                default:   return '\\' + s;
                // @formatter:off
                }
            });
    }
}));

